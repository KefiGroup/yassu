import { Router } from 'express';
import { pool } from './db';
import { requireAuth } from './middleware';

const router = Router();

// Express interest in an idea
router.post('/api/ideas/:ideaId/interest', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user?.id;
    const { message, motivation, role, timeCommitment, experience } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is the creator (can't express interest in own idea)
    const ideaResult = await pool.query(
      'SELECT created_by FROM ideas WHERE id = $1',
      [ideaId]
    );

    if (!ideaResult.rows[0]) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (ideaResult.rows[0].created_by === userId) {
      return res.status(400).json({ error: 'Cannot express interest in your own idea' });
    }

    // Check if already expressed interest
    const existingInterest = await pool.query(
      'SELECT id, status FROM idea_interests WHERE idea_id = $1 AND user_id = $2',
      [ideaId, userId]
    );

    if (existingInterest.rows[0]) {
      return res.status(400).json({ 
        error: 'You have already expressed interest in this idea',
        status: existingInterest.rows[0].status
      });
    }

    // Create interest record with application details
    const result = await pool.query(
      `INSERT INTO idea_interests (idea_id, user_id, message, motivation, role, time_commitment, experience, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [ideaId, userId, message || null, motivation || null, role || null, timeCommitment || null, experience || null]
    );

    // TODO: Send notification to idea creator
    // await sendNotification(ideaResult.rows[0].created_by, {
    //   title: 'New Interest in Your Idea!',
    //   message: `Someone wants to join your idea`,
    //   link: `/portal/my-ideas/${ideaId}/interests`
    // });

    res.json({ 
      success: true, 
      interest: result.rows[0],
      message: 'Interest expressed successfully! The creator will review your request.'
    });
  } catch (error) {
    console.error('Error expressing interest:', error);
    res.status(500).json({ error: 'Failed to express interest' });
  }
});

// Get interests for a specific idea (creator only)
router.get('/api/ideas/:ideaId/interests', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is the creator
    const ideaResult = await pool.query(
      'SELECT created_by FROM ideas WHERE id = $1',
      [ideaId]
    );

    if (!ideaResult.rows[0]) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (ideaResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only the idea creator can view interests' });
    }

    // Get all interests with user details
    const result = await pool.query(
      `SELECT 
        ii.*,
        u.id as user_id,
        u.email,
        u.full_name,
        u.university,
        u.major,
        u.year,
        u.bio,
        u.skills,
        u.interests as user_interests,
        u.linkedin_url,
        u.github_url,
        u.portfolio_url
      FROM idea_interests ii
      JOIN users u ON ii.user_id = u.id
      WHERE ii.idea_id = $1
      ORDER BY 
        CASE ii.status 
          WHEN 'pending' THEN 1 
          WHEN 'accepted' THEN 2 
          WHEN 'rejected' THEN 3 
        END,
        ii.created_at DESC`,
      [ideaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

// Get all interests for current user (to see which ideas they've expressed interest in)
router.get('/api/my-interests', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT 
        ii.*,
        i.id as idea_id,
        i.title as idea_title,
        i.problem,
        i.solution,
        i.stage,
        i.tags,
        creator.full_name as creator_name,
        creator.email as creator_email
      FROM idea_interests ii
      JOIN ideas i ON ii.idea_id = i.id
      JOIN users creator ON i.created_by = creator.id
      WHERE ii.user_id = $1
      ORDER BY ii.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my interests:', error);
    res.status(500).json({ error: 'Failed to fetch your interests' });
  }
});

// Update interest status (accept/reject/pending) - creator only
router.patch('/api/ideas/:ideaId/interests/:interestId', requireAuth, async (req, res) => {
  try {
    const { ideaId, interestId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify user is the creator
    const ideaResult = await pool.query(
      'SELECT created_by FROM ideas WHERE id = $1',
      [ideaId]
    );

    if (!ideaResult.rows[0]) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (ideaResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only the idea creator can update interest status' });
    }

    // Update interest status
    const result = await pool.query(
      `UPDATE idea_interests 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND idea_id = $3
       RETURNING *`,
      [status, interestId, ideaId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    // TODO: Send notification to interested user
    // if (status === 'accepted') {
    //   await sendNotification(result.rows[0].user_id, {
    //     title: 'Your Interest Was Accepted!',
    //     message: `The creator accepted your request to join their idea`,
    //     link: `/portal/ideas/${ideaId}`
    //   });
    // }

    res.json({ 
      success: true, 
      interest: result.rows[0],
      message: `Interest ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating interest:', error);
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

// Get interest count for an idea (public)
router.get('/api/ideas/:ideaId/interest-count', async (req, res) => {
  try {
    const { ideaId } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
      FROM idea_interests
      WHERE idea_id = $1`,
      [ideaId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching interest count:', error);
    res.status(500).json({ error: 'Failed to fetch interest count' });
  }
});

// Check if current user has expressed interest in an idea
router.get('/api/ideas/:ideaId/my-interest', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.json({ hasInterest: false });
    }

    const result = await pool.query(
      'SELECT * FROM idea_interests WHERE idea_id = $1 AND user_id = $2',
      [ideaId, userId]
    );

    res.json({ 
      hasInterest: result.rows.length > 0,
      interest: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error checking interest:', error);
    res.status(500).json({ error: 'Failed to check interest' });
  }
});

export default router;

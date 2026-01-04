import { Router, Request, Response } from 'express';

const router = Router();

// Import LinkedIn profile data
router.post('/import-profile', async (req: Request, res: Response) => {
  // Check authentication
  if (!(req as any).session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const { linkedinUrl } = req.body;
    
    if (!linkedinUrl) {
      return res.status(400).json({ error: 'LinkedIn URL is required' });
    }
    
    // Extract username from LinkedIn URL
    const usernameMatch = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (!usernameMatch) {
      return res.status(400).json({ error: 'Invalid LinkedIn URL format' });
    }
    
    const username = usernameMatch[1];
    
    // Call Manus LinkedIn API
    const { spawn } = require('child_process');
    const pythonScript = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json

try:
    client = ApiClient()
    profile_data = client.call_api('LinkedIn/get_user_profile_by_username', query={'username': '${username}'})
    print(json.dumps(profile_data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    
    const python = spawn('python3', ['-c', pythonScript]);
    let dataString = '';
    let errorString = '';
    
    python.stdout.on('data', (data: Buffer) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data: Buffer) => {
      errorString += data.toString();
    });
    
    python.on('close', (code: number) => {
      if (code !== 0) {
        console.error('Python script error:', errorString);
        return res.status(500).json({ error: 'Failed to fetch LinkedIn data' });
      }
      
      try {
        const profileData = JSON.parse(dataString);
        
        if (profileData.error) {
          return res.status(500).json({ error: profileData.error });
        }
        
        // Extract relevant data
        const extractedData = {
          fullName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
          headline: profileData.headline || '',
          bio: profileData.summary || '',
          location: profileData.geo?.full || '',
          profilePicture: profileData.profilePicture || '',
          skills: (profileData.skills || []).slice(0, 10).map((s: any) => s.name),
          experience: (profileData.position || []).slice(0, 3).map((p: any) => ({
            title: p.title,
            company: p.companyName,
            startYear: p.start?.year,
            endYear: p.end?.year || 'Present'
          })),
          education: (profileData.educations || []).slice(0, 2).map((e: any) => ({
            school: e.schoolName,
            degree: e.degree,
            field: e.fieldOfStudy,
            startYear: e.start?.year,
            endYear: e.end?.year
          }))
        };
        
        res.json({ success: true, data: extractedData });
      } catch (parseError) {
        console.error('Parse error:', parseError);
        return res.status(500).json({ error: 'Failed to parse LinkedIn data' });
      }
    });
    
  } catch (error) {
    console.error('LinkedIn import error:', error);
    res.status(500).json({ error: 'Failed to import LinkedIn profile' });
  }
});

export default router;

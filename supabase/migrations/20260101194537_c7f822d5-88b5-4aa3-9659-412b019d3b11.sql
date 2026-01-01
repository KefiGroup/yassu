-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'alumni', 'founder_pro', 'investor', 'sponsor', 'admin');

-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Create project/idea stage enum
CREATE TYPE public.idea_stage AS ENUM ('concept', 'validating', 'building', 'launched');

-- Create workflow type enum
CREATE TYPE public.workflow_type AS ENUM (
  'idea_founder_fit',
  'competitive_landscape', 
  'risk_moat_builder',
  'product_mvp_design',
  'team_talent',
  'launch_plan',
  'school_advantage',
  'funding_pitch'
);

-- Create investing pipeline stage enum
CREATE TYPE public.pipeline_stage AS ENUM ('watchlist', 'diligence', 'pass', 'invest');

-- Universities table
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- University Resources table
CREATE TABLE public.university_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- incubator, lab, grant, alumni_program, professor, link
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  university_id UUID REFERENCES public.universities(id),
  club_id UUID REFERENCES public.clubs(id),
  major TEXT,
  graduation_year INTEGER,
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  availability TEXT, -- full-time, part-time, weekends
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  bio TEXT,
  verification_status public.verification_status DEFAULT 'pending',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT,
  target_user TEXT,
  why_now TEXT,
  assumptions TEXT,
  desired_teammates TEXT,
  expected_timeline TEXT,
  stage public.idea_stage DEFAULT 'concept',
  university_id UUID REFERENCES public.universities(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idea tags
CREATE TABLE public.idea_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(idea_id, tag)
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  idea_id UUID REFERENCES public.ideas(id),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- founder, co-founder, member
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Join requests (for ideas and teams)
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES public.ideas(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, paused, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project docs (markdown)
CREATE TABLE public.project_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project tasks
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, doing, done
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow runs
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_type public.workflow_type NOT NULL,
  inputs JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Workflow artifacts (versioned outputs)
CREATE TABLE public.workflow_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE NOT NULL,
  version INTEGER DEFAULT 1,
  content TEXT, -- markdown output
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments/Messages
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor challenges
CREATE TABLE public.sponsor_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active, closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challenge applications
CREATE TABLE public.challenge_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.sponsor_challenges(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pitch TEXT,
  status TEXT DEFAULT 'pending', -- pending, shortlisted, accepted, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Investing pipeline
CREATE TABLE public.investing_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  flagged_by UUID REFERENCES auth.users(id) NOT NULL,
  stage public.pipeline_stage DEFAULT 'watchlist',
  traction_score INTEGER DEFAULT 0,
  team_score INTEGER DEFAULT 0,
  market_score INTEGER DEFAULT 0,
  defensibility_score INTEGER DEFAULT 0,
  notes TEXT,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investing_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is verified
CREATE OR REPLACE FUNCTION public.is_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND verification_status = 'verified'
  )
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Universities: public read
CREATE POLICY "Universities are viewable by everyone" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Admins can manage universities" ON public.universities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Clubs: public read
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Admins can manage clubs" ON public.clubs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- University resources: public read
CREATE POLICY "Resources are viewable by everyone" ON public.university_resources FOR SELECT USING (true);
CREATE POLICY "Admins can manage resources" ON public.university_resources FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: users can view all, edit own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles: viewable by own user and admins
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Ideas: public read for public ideas, creator can manage
CREATE POLICY "Public ideas are viewable by everyone" ON public.ideas FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Verified users can create ideas" ON public.ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their ideas" ON public.ideas FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their ideas" ON public.ideas FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Idea tags
CREATE POLICY "Tags viewable with ideas" ON public.idea_tags FOR SELECT USING (true);
CREATE POLICY "Creators can manage tags" ON public.idea_tags FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ideas WHERE id = idea_id AND created_by = auth.uid())
);

-- Teams
CREATE POLICY "Teams viewable by authenticated" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team creators can update" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Team members
CREATE POLICY "Team members viewable" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team creators can manage members" ON public.team_members FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Members can leave teams" ON public.team_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Join requests
CREATE POLICY "Users can view own requests" ON public.join_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.ideas WHERE id = idea_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Users can create requests" ON public.join_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Request owners can update" ON public.join_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ideas WHERE id = idea_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);

-- Projects
CREATE POLICY "Projects viewable by team members" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can update projects" ON public.projects FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
);

-- Project docs
CREATE POLICY "Docs viewable by team" ON public.project_docs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.team_members tm ON p.team_id = tm.team_id WHERE p.id = project_id AND tm.user_id = auth.uid())
);
CREATE POLICY "Team can manage docs" ON public.project_docs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.team_members tm ON p.team_id = tm.team_id WHERE p.id = project_id AND tm.user_id = auth.uid())
);

-- Project tasks
CREATE POLICY "Tasks viewable by team" ON public.project_tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.team_members tm ON p.team_id = tm.team_id WHERE p.id = project_id AND tm.user_id = auth.uid())
);
CREATE POLICY "Team can manage tasks" ON public.project_tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.team_members tm ON p.team_id = tm.team_id WHERE p.id = project_id AND tm.user_id = auth.uid())
);

-- Workflow runs
CREATE POLICY "Users can view own runs" ON public.workflow_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create runs" ON public.workflow_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own runs" ON public.workflow_runs FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Workflow artifacts
CREATE POLICY "Artifacts viewable by run owner" ON public.workflow_artifacts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workflow_runs WHERE id = workflow_run_id AND user_id = auth.uid())
);
CREATE POLICY "Run owners can create artifacts" ON public.workflow_artifacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.workflow_runs WHERE id = workflow_run_id AND user_id = auth.uid())
);

-- Comments
CREATE POLICY "Comments viewable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Sponsor challenges
CREATE POLICY "Active challenges viewable" ON public.sponsor_challenges FOR SELECT USING (status = 'active' OR sponsor_id = auth.uid());
CREATE POLICY "Sponsors can manage own challenges" ON public.sponsor_challenges FOR ALL TO authenticated USING (
  sponsor_id = auth.uid() OR public.has_role(auth.uid(), 'sponsor')
);

-- Challenge applications
CREATE POLICY "Applicants can view own" ON public.challenge_applications FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.sponsor_challenges WHERE id = challenge_id AND sponsor_id = auth.uid())
);
CREATE POLICY "Users can apply" ON public.challenge_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Investing pipeline: investors and admins only
CREATE POLICY "Investors can view pipeline" ON public.investing_pipeline FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'investor') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can manage pipeline" ON public.investing_pipeline FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Seed initial universities
INSERT INTO public.universities (name, short_name, domain) VALUES
  ('University of California, Los Angeles', 'UCLA', 'ucla.edu'),
  ('University of California, Berkeley', 'Berkeley', 'berkeley.edu'),
  ('Massachusetts Institute of Technology', 'MIT', 'mit.edu'),
  ('Harvard University', 'Harvard', 'harvard.edu'),
  ('Northwestern University', 'Northwestern', 'northwestern.edu'),
  ('Stanford University', 'Stanford', 'stanford.edu'),
  ('University of Pennsylvania', 'UPenn', 'upenn.edu'),
  ('Columbia University', 'Columbia', 'columbia.edu');

-- Seed some university resources for UCLA and MIT
INSERT INTO public.university_resources (university_id, type, name, description, url) 
SELECT id, 'incubator', 'UCLA Startup Lab', 'Student-run startup accelerator', 'https://startup.ucla.edu'
FROM public.universities WHERE short_name = 'UCLA';

INSERT INTO public.university_resources (university_id, type, name, description, url) 
SELECT id, 'grant', 'Blackstone LaunchPad', 'Entrepreneurship resources and funding', 'https://blackstonelaunchpad.org'
FROM public.universities WHERE short_name = 'UCLA';

INSERT INTO public.university_resources (university_id, type, name, description, url) 
SELECT id, 'incubator', 'MIT Sandbox', 'Innovation fund for MIT students', 'https://sandbox.mit.edu'
FROM public.universities WHERE short_name = 'MIT';

INSERT INTO public.university_resources (university_id, type, name, description, url) 
SELECT id, 'lab', 'MIT Media Lab', 'Research laboratory for emerging technologies', 'https://media.mit.edu'
FROM public.universities WHERE short_name = 'MIT';
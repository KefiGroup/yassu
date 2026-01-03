import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

const CALLBACK_BASE = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000";

export function setupOAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${CALLBACK_BASE}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"), undefined);
            }

            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create new user with random password (they'll use OAuth)
              const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
              user = await storage.createUser({
                email,
                password: randomPassword,
                fullName: profile.displayName || email.split("@")[0],
              });

              await storage.createProfile(user.id, {
                email,
                fullName: profile.displayName || null,
                avatarUrl: profile.photos?.[0]?.value || null,
                verificationStatus: "verified",
                onboardingCompleted: false,
                skills: [],
                interests: [],
              });
              await storage.addUserRole(user.id, "student");
            }

            done(null, user);
          } catch (error) {
            done(error as Error, undefined);
          }
        }
      )
    );

    // Google OAuth routes
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (req: Request, res: Response) => {
        // Set session userId for compatibility with existing auth
        if (req.user) {
          req.session.userId = (req.user as any).id;
        }
        res.redirect("/portal");
      }
    );
  }

  // Apple OAuth routes (placeholder - requires more complex setup)
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    app.get("/api/auth/apple", (req: Request, res: Response) => {
      res.redirect("/auth?error=apple_not_configured");
    });

    app.post("/api/auth/apple/callback", (req: Request, res: Response) => {
      res.redirect("/auth?error=apple_not_configured");
    });
  }

  // Check if OAuth providers are configured
  app.get("/api/auth/providers", (req: Request, res: Response) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID),
    });
  });
}

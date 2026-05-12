import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <Card className="max-w-md w-full" data-testid="card-not-found">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">404 — Page not found</CardTitle>
            <CardDescription>
              We couldn't find the page{' '}
              <span className="font-mono text-foreground break-all" data-testid="text-attempted-path">
                {location.pathname}
              </span>
              . The link may be broken, or the page may have moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2 justify-center pb-6">
            <Button variant="outline" onClick={() => navigate(-1)} data-testid="button-go-back">
              Go Back
            </Button>
            <Button onClick={() => navigate('/')} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;

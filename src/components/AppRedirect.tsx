import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Component that handles /app/* routes by stripping the /app prefix
 * and redirecting to the actual route. This is needed for Android App Links
 * to work properly - when the app isn't installed or links aren't verified,
 * Chrome will load the webpage, which needs to redirect to the correct route.
 */
const AppRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Strip /app prefix and redirect to the actual route
    const path = location.pathname.replace(/^\/app/, "") || "/";
    const fullPath = path + location.search + location.hash;
    
    console.log("[AppRedirect] Redirecting from", location.pathname, "to", fullPath);
    navigate(fullPath, { replace: true });
  }, [location, navigate]);

  return null;
};

export default AppRedirect;

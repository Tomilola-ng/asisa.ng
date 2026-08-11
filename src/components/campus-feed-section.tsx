import { Feed } from "@/components/feed";
import { LoginGateFade } from "@/components/login-gate-fade";
import { useAuth } from "@/lib/auth-context";

const TITLE = "Campus feed";
const DESCRIPTION = "Announcements and discussion from the Actuarial Science & Insurance Nexus community.";
const LOGIN_MESSAGE = "You need to be logged in to access the campus feed.";

interface CampusFeedSectionProps {
  /** Compact layout when embedded on the dashboard */
  embedded?: boolean;
  /** Optional wrapper class — e.g. border-top on dashboard */
  className?: string;
}

export function CampusFeedSection({ embedded = false, className }: CampusFeedSectionProps) {
  const { user } = useAuth();

  const content = user ? (
    <Feed embedded={embedded} title={TITLE} description={DESCRIPTION} scope="public" />
  ) : (
    <LoginGateFade
      title={TITLE}
      description={DESCRIPTION}
      variant="feed"
      message={LOGIN_MESSAGE}
    />
  );

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return content;
}

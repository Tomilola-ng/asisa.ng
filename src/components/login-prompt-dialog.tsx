import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function LoginPromptDialog({
  open,
  onOpenChange,
  title = "Sign in to continue",
  description = "Create a free ASISA account or log in to access course materials, the full feed, and more.",
}: LoginPromptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/auth" search={{ mode: "signup" }} onClick={() => onOpenChange(false)}>
              Create account
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/auth" search={{ mode: "signin" }} onClick={() => onOpenChange(false)}>
              Log in
            </Link>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

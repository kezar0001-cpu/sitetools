import { redirect } from "next/navigation";

// The tools directory has been superseded by the dedicated module marketing pages
// and the landing page module cards. Redirect visitors to the home page.
export default function ToolsPage() {
  redirect("/");
}

import { LocalePage } from "@/components/site/LocalePage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("en");

export default function Page() {
  return <LocalePage locale="en" />;
}

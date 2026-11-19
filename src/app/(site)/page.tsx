import { LocalePage } from "@/components/site/LocalePage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("uk");

export default function Page() {
  return <LocalePage locale="uk" />;
}

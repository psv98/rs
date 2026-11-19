import { PresentPage } from "@/components/present/PresentPage";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata("uk", "/present");
export default function Page() {
  return <PresentPage locale="uk" />;
}

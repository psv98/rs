import { LocalePage } from "@/components/site/LocalePage";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata("en");

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LocalePage locale="en" searchParams={props.searchParams} />;
}

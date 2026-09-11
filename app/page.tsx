import FeedbackForm from "./components/FeedbackForm";
import LiveSite from "./components/LiveSite";
import { readSiteState } from "@/lib/siteState";
import { withServerTime } from "@/lib/sitePayload";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await readSiteState();

  return (
    <main
      className="d-flex align-items-center justify-content-center py-5 px-3"
      style={{ minHeight: "100vh" }}
    >
      <div className="w-100" style={{ maxWidth: 560 }}>
        <LiveSite initial={withServerTime(state)} />

        <div className="card">
          <div className="card-body p-4 p-md-5">
            <h1 className="h5 mb-1 text-center">Обратная связь</h1>
            <p className="text-muted text-center mb-4">
              Оставьте заявку — мы свяжемся с вами в выбранный срок.
            </p>
            <FeedbackForm />
          </div>
        </div>
      </div>
    </main>
  );
}

import FeedbackForm from "./components/FeedbackForm";

export default function Home() {
  return (
    <main
      className="d-flex align-items-center justify-content-center py-5 px-3"
      style={{ minHeight: "100vh" }}
    >
      <div className="w-100" style={{ maxWidth: 560 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <h1 className="h3 mb-1 text-center">ОТГРЫЗИ СВОИ ЯЙЦА</h1>
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

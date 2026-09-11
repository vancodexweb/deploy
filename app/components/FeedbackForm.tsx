"use client";

import { useState, type FormEvent } from "react";

const CONTACT_WINDOWS = [
  "Как можно скорее",
  "В течение часа",
  "В течение дня",
  "В течение недели",
];

type Status = "idle" | "loading" | "success" | "error";

export default function FeedbackForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      message: String(data.get("message") || "").trim(),
      contactWindow: String(data.get("contactWindow") || ""),
      website: String(data.get("website") || ""),
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Не удалось отправить заявку");
      }

      setStatus("success");
      form.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось отправить заявку"
      );
    }
  }

  if (status === "success") {
    return (
      <div className="alert alert-success mb-0" role="alert">
        Спасибо! Заявка отправлена — мы свяжемся с вами в выбранный срок.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3">
        <label htmlFor="name" className="form-label">
          Имя
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="form-control"
          placeholder="Как к вам обращаться"
          required
          disabled={status === "loading"}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="contact" className="form-label">
          Telegram или телефон
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          className="form-control"
          placeholder="@username или +7 900 000-00-00"
          required
          disabled={status === "loading"}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="message" className="form-label">
          Сообщение
        </label>
        <textarea
          id="message"
          name="message"
          className="form-control"
          rows={4}
          placeholder="Коротко опишите вопрос"
          required
          disabled={status === "loading"}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="contactWindow" className="form-label">
          В течение какого времени с вами связаться
        </label>
        <select
          id="contactWindow"
          name="contactWindow"
          className="form-select"
          defaultValue={CONTACT_WINDOWS[0]}
          disabled={status === "loading"}
        >
          {CONTACT_WINDOWS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="d-none"
        aria-hidden="true"
      />

      {status === "error" && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Отправка..." : "Отправить"}
      </button>
    </form>
  );
}

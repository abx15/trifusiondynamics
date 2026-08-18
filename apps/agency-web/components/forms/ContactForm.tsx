"use client";

import { useState, FormEvent } from "react";
import { submitContactForm } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

type SubmissionStatus = "idle" | "loading" | "success" | "error" | "rate-limit";

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validate = (): boolean => {
    const tempErrors: FormErrors = {};
    let isValid = true;

    // Name Validation
    if (!formData.name.trim()) {
      tempErrors.name = "Full name is required";
      isValid = false;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      tempErrors.email = "Email address is required";
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      tempErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Message Validation
    if (!formData.message.trim()) {
      tempErrors.message = "Message content is required";
      isValid = false;
    } else if (formData.message.trim().length < 10) {
      tempErrors.message = "Message must be at least 10 characters long";
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error on type
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      await submitContactForm(formData);
      setStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err: any) {
      console.error("Submission failed:", err);
      if (err.message === "RATE_LIMIT") {
        setStatus("rate-limit");
      } else {
        setStatus("error");
        setErrorMessage(
          err.message || "An unexpected error occurred. Please try again later."
        );
      }
    }
  };

  if (status === "success") {
    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border border-primary/20 bg-primary/5 flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h3 className="text-2xl font-display font-bold text-white mt-2">Message Sent!</h3>
        <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
          Thanks! We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 min-h-[44px] rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/10 active:scale-95 transition-colors"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 max-w-2xl mx-auto">
      {/* Rate Limit Alert */}
      {status === "rate-limit" && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3 text-amber-300 text-xs sm:text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Please wait a moment before submitting again.</span>
        </div>
      )}

      {/* Error Alert */}
      {status === "error" && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3 text-rose-300 text-xs sm:text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Full Name <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Arun Kumar"
            disabled={status === "loading"}
            className={`w-full min-h-[46px] rounded-xl border bg-[#03060c] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
              errors.name
                ? "border-rose-500/50 focus:ring-rose-500"
                : "border-white/10 focus:border-primary/50 focus:ring-primary"
            }`}
          />
          {errors.name && <p className="text-xs text-rose-400 mt-1.5">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Email Address <span className="text-primary">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="arun@trifusion.ai"
            disabled={status === "loading"}
            className={`w-full min-h-[46px] rounded-xl border bg-[#03060c] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
              errors.email
                ? "border-rose-500/50 focus:ring-rose-500"
                : "border-white/10 focus:border-primary/50 focus:ring-primary"
            }`}
          />
          {errors.email && <p className="text-xs text-rose-400 mt-1.5">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Phone Number <span className="text-slate-600">(Optional)</span>
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            disabled={status === "loading"}
            className="w-full min-h-[46px] rounded-xl border border-white/10 bg-[#03060c] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-primary/50 focus:ring-primary"
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Subject <span className="text-slate-600">(Optional)</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="AI Platform Architecture Consulting"
            disabled={status === "loading"}
            className="w-full min-h-[46px] rounded-xl border border-white/10 bg-[#03060c] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-primary/50 focus:ring-primary"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Your Message <span className="text-primary">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          placeholder="Briefly describe your project goals, timelines, or infrastructure details..."
          disabled={status === "loading"}
          className={`w-full rounded-xl border bg-[#03060c] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
            errors.message
              ? "border-rose-500/50 focus:ring-rose-500"
              : "border-white/10 focus:border-primary/50 focus:ring-primary"
          }`}
        />
        {errors.message && <p className="text-xs text-rose-400 mt-1.5">{errors.message}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 min-h-[50px] rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 text-center text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed transition-all"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
            Submitting Proposal...
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}

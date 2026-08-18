import ContactForm from "@/components/forms/ContactForm";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Contact & Consultations",
  description: "Schedule a tech strategy session or request a proposal for custom AI architectures and full-stack SaaS builds.",
  slug: "contact",
});

export default function ContactPage() {
  return (
    <div className="bg-[#070a13] py-20 relative">
      {/* Decorative Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8 relative">

        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Get In Touch</span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mt-3 mb-6 tracking-tight">
            Let&apos;s Build Something <br />
            <span className="text-gradient-cyan-blue">Exceptional Together.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Need architect advice, pricing breakdowns, or workflow scoping? Fill out the form or email us directly. We respond to all qualified queries within 24 hours.
          </p>
        </div>

        {/* Contact Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Info Details (Left Col) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <h3 className="font-display font-bold text-white text-lg">Contact Info</h3>

              <ul className="space-y-5 text-sm text-slate-300">
                <li className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Email Us</p>
                    <a href="mailto:support.trifusion@gmail.com" className="hover:text-primary transition-colors font-medium">
                      support.trifusion@gmail.com                    </a>
                  </div>
                </li>

                <li className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Call Us</p>
                    <a href="tel:+918745883950" className="hover:text-primary transition-colors font-medium">
                      +91 8745883950
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary mt-0.5">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Office Location</p>
                    <span className="text-sm font-medium text-white leading-relaxed block mt-1">
                      New Ashok Nagar, East Delhi, <br />
                      Delhi – 110096, India
                    </span>
                  </div>

                </li>
              </ul>
            </div>

            {/* Office Hours Card */}
            <div className="glass-panel rounded-3xl p-8 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary mt-0.5">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-white text-base mb-1">Response Hours</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Monday &ndash; Friday, 9:00 AM &ndash; 6:00 PM IST. <br />
                  For existing clients, ticketing channels remain open 24/7.
                </p>
              </div>
            </div>
          </div>

          {/* Form Block (Right Col) */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>

        </div>

      </div>
    </div>
  );
}

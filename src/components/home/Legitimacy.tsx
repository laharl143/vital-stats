const badges = [
  {
    icon: "🔬",
    title: "Clinically Guided",
    desc: "Every product offered with proper professional guidance for safe and responsible use.",
  },
  {
    icon: "✓",
    title: "Philippine FDA–Approved",
    desc: "Skincare line reviewed and approved by the Philippine Food and Drug Administration.",
  },
  {
    icon: "🛡",
    title: "Verified Suppliers",
    desc: "Authentic products sourced only from trusted and verified pharmaceutical suppliers.",
  },
  {
    icon: "👨‍⚕️",
    title: "Medical Oversight",
    desc: "Injectable programs are medically supervised with ongoing progress monitoring.",
  },
];

export default function Legitimacy() {
  return (
    <section
      className="py-20 px-8 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-20 items-center"
      style={{ background: "var(--teal-deep)" }}
    >
      {/* Left copy */}
      <div>
        <div
          className="flex items-center gap-3 text-[11px] font-medium tracking-[0.18em] uppercase mb-4"
          style={{ color: "var(--teal-light)" }}
        >
          <span className="block w-6 h-px" style={{ background: "var(--teal-light)" }} />
          Our commitment
        </div>
        <h2
          className="font-display font-light leading-[1.25] text-white"
          style={{ fontSize: "clamp(28px, 2.8vw, 36px)" }}
        >
          Authentic products.<br />
          Verified suppliers.<br />
          Safe practice.
        </h2>
        <p
          className="text-[13px] leading-[1.8] font-light mt-5"
          style={{ color: "rgba(255,255,255,0.58)" }}
        >
          We are committed to providing authentic, high-quality products from
          trusted and verified suppliers. All products are handled by trained
          professionals, including medical technologists.
        </p>
      </div>

      {/* Badges grid — spans 2 cols */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {badges.map((b) => (
          <div
            key={b.title}
            className="flex gap-4 items-start p-6 rounded-[10px]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {/* Icon bubble */}
            <div
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-[15px]"
              style={{ background: "rgba(92,175,160,0.15)" }}
            >
              {b.icon}
            </div>
            <div>
              <div className="text-[13px] font-medium text-white mb-[5px]">
                {b.title}
              </div>
              <div
                className="text-[11px] leading-[1.6]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {b.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

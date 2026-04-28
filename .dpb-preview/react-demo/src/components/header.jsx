export default function Header() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">React + Vite</p>
        <h1>Header Component</h1>
        <p>
          This header is coming from a separate component file. The preview is now
          using multi-file React composition.
        </p>

        <div className="actions">
          <button>Get Started</button>
          <button className="secondary">View Project</button>
        </div>
      </section>
    </main>
  );
}
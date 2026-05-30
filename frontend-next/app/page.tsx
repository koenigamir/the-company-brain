import Link from "next/link";

const coreTopics = [
  "MiFID II and MiFIR workflow coverage",
  "SFDR, ESG, and sustainability disclosure context",
  "FATCA, tax, and reference-data ownership trails",
];

const valuePoints = [
  {
    title: "Grounded answers",
    copy:
      "Every response is tied back to indexed material instead of acting like a generic chatbot.",
  },
  {
    title: "Transparent ownership",
    copy:
      "Seven surfaces likely owners, source files, update dates, and routing clues around each answer.",
  },
  {
    title: "Living knowledge base",
    copy:
      "Users can grow the system by uploading new documents directly from the product experience.",
  },
];

export default function Home() {
  return (
    <main className="pageShell landingShell">
      <section className="landingHero">
        <div className="heroCopy">
          <p className="eyebrow">Welcome to Seven</p>
          <h1>The modern interface for company knowledge that should not stay trapped in inboxes and experts.</h1>
          <p className="lede">
            Seven turns regulatory, tax, ESG, and reference-data material into a
            searchable, source-aware workspace built on the Company Brain backend.
          </p>

          <div className="actionRow">
            <a className="primaryButton" href="#start">
              Explore the flow
            </a>
            <Link className="secondaryLink" href="/query">
              Jump straight to query
            </Link>
          </div>
        </div>

        <div className="heroPanel">
          <p className="heroPanelLabel">What Seven is built for</p>
          <ul className="heroTopicList">
            {coreTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          <div className="heroPanelFooter">
            <span>Query verified knowledge</span>
            <span>Upload new context</span>
            <span>Route unresolved gaps</span>
          </div>
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <p className="eyebrow">Why it matters</p>
          <h2>Seven helps teams reuse expertise instead of re-hunting for it.</h2>
        </div>
        <div className="featureGrid">
          {valuePoints.map((point) => (
            <article className="featureCard" key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <p className="eyebrow">How the product flows</p>
          <h2>Start with a question, inspect the evidence, then add what is missing.</h2>
        </div>
        <div className="journeyGrid">
          <article className="journeyStep">
            <span className="journeyNumber">01</span>
            <h3>Ask a business question</h3>
            <p>
              Use the dedicated query workspace to ask about MiFID, SFDR, FATCA, ESG,
              reference data, and related internal material.
            </p>
          </article>
          <article className="journeyStep">
            <span className="journeyNumber">02</span>
            <h3>Inspect answer confidence</h3>
            <p>
              Seven shows sources, owners, graph traces, and knowledge-gap routing so
              teams can trust or challenge the output.
            </p>
          </article>
          <article className="journeyStep">
            <span className="journeyNumber">03</span>
            <h3>Grow the indexed knowledge</h3>
            <p>
              Upload new documents through the product so the backend can refresh the
              graph and vector store for the next question.
            </p>
          </article>
        </div>
      </section>

      <section className="landingSection ctaSection" id="start">
        <div className="sectionHeading">
          <p className="eyebrow">Get started</p>
          <h2>Choose the part of Seven you want to enter.</h2>
        </div>
        <div className="ctaGrid">
          <article className="ctaCard">
            <h3>Go to the query page</h3>
            <p>
              Ask the backend what it already knows and inspect the answer trail in the
              dedicated workspace.
            </p>
            <Link className="primaryButton" href="/query">
              Open query workspace
            </Link>
          </article>
          <article className="ctaCard subtle">
            <h3>Go to the upload page</h3>
            <p>
              Add new source documents so Seven can expand what it can answer next.
            </p>
            <Link className="secondaryButton" href="/upload">
              Open upload workspace
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}

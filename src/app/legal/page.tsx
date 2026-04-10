import Image from 'next/image';

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/">
            <Image src="/logo-notifeo.png" alt="Notifeo" width={1000} height={400} className="h-10 w-auto" />
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-10 prose prose-gray">
        <h1>Mentions légales</h1>

        <h2>Éditeur du site</h2>
        <p>
          <strong>HBVR</strong><br />
          Forme juridique : SAS<br />
          Siège social : 8 rue Jeanne Pariset, 69530 BRIGNAIS<br />
          SIRET : 84763452400031<br />
          Responsable de la publication : David SEVE<br />
          Email : <a href="mailto:contact@notifeo.fr">contact@notifeo.fr</a>
        </p>

        <h2>Hébergement</h2>
        <p>
          <strong>Vercel Inc.</strong><br />
          440 N Barranca Ave #4133, Covina, CA 91723, USA<br />
          Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
        </p>
        <p>
          <strong>Supabase Inc.</strong> (base de données et stockage)<br />
          970 Toa Payoh North #07-04, Singapore 318992<br />
          Données hébergées en Europe (OVH eu-west-1, Irlande)<br />
          Site : <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du contenu de ce site (textes, images, logo, code) est la propriété
          exclusive de HBVR. Toute reproduction, même partielle, est interdite sans
          autorisation préalable.
        </p>

        <h2>Cookies</h2>
        <p>
          Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement
          de l&apos;application (authentification, session). Aucun cookie de tracking ou
          publicitaire n&apos;est utilisé.
        </p>
      </div>
    </main>
  );
}

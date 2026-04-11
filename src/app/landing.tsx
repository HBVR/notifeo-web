import Image from 'next/image';
import Link from 'next/link';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* ====== HEADER ====== */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/logo-notifeo.png"
            alt="Notifeo"
            width={1000}
            height={400}
            priority
            className="h-10 w-auto"
          />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Se connecter
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      {/* ====== HERO ====== */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Signalez. Notifiez.{' '}
          <span className="text-blue-600">Résolvez.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          L&apos;outil de signalement terrain le plus simple du marché.
          Vos employés signalent en 10 secondes, vous êtes alerté en temps réel.
          Échangez directement sur chaque signalement. Zéro app à installer.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login?mode=signup"
            className="rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Commencer gratuitement
          </Link>
          <a
            href="#pricing"
            className="rounded-xl border border-gray-300 px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voir les tarifs
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Gratuit jusqu&apos;à 3 utilisateurs · Aucune carte bancaire requise
        </p>
      </section>

      {/* ====== VIDÉO DÉMO ====== */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-4">
            Découvrez Notifeo en action
          </h2>
          <p className="mx-auto max-w-xl text-center text-gray-600 mb-10">
            2 minutes pour comprendre comment Notifeo simplifie vos signalements terrain.
          </p>
          <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl mx-auto max-w-7xl" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/D1GDepw5sqM?rel=0"
              title="Démo Notifeo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ====== COMMENT ÇA MARCHE ====== */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-600">
            3 étapes, aucune formation requise.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Étape 1 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
                📋
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">
                1. Créez vos sites
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Ajoutez vos chantiers, magasins ou sites en 1 clic depuis le dashboard.
                Un QR code unique est généré automatiquement.
              </p>
            </div>
            {/* Étape 2 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
                📱
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">
                2. L&apos;employé signale
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Depuis son téléphone, il sélectionne le site, prend une photo,
                décrit le problème. Envoyé en 10 secondes.
              </p>
            </div>
            {/* Étape 3 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
                🔔
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">
                3. Le manager est alerté
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Notification en temps réel. Changez le statut, annotez les photos,
                suivez la résolution depuis le dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== AVANTAGES ====== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Pourquoi Notifeo
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              { icon: '⚡', title: 'Zéro installation', desc: 'Fonctionne dans le navigateur. Aucune app à télécharger.' },
              { icon: '📸', title: 'Photo + annotation', desc: 'Prenez une photo, dessinez dessus, ajoutez du texte.' },
              { icon: '🎤', title: 'Dictée vocale', desc: 'Décrivez le problème à la voix. Idéal les mains sales sur le terrain.' },
              { icon: '💬', title: 'Conversation intégrée', desc: 'Discutez directement sur chaque signalement. Historique complet.' },
              { icon: '🔔', title: 'Alertes en temps réel', desc: 'Badge et compteur de nouvelles notifs. Rien ne vous échappe.' },
              { icon: '🔒', title: 'Sécurisé & RGPD', desc: 'Données isolées par organisation. Hébergé en Europe.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="pricing" className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Tarifs simples, sans surprise
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-600">
            Commencez gratuitement, évoluez quand vous grandissez.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Starter */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Starter</h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">0€</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>✓ 1 site</li>
                <li>✓ 3 utilisateurs</li>
                <li>✓ 20 notifs/mois</li>
                <li>✓ Photos + annotations</li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="mt-8 block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Commencer gratuitement
              </Link>
            </div>
            {/* Pro */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border-2 border-blue-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                Populaire
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pro</h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">19€</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>✓ 10 sites</li>
                <li>✓ 25 utilisateurs</li>
                <li>✓ 500 notifs/mois</li>
                <li>✓ Analytics + export CSV</li>
                <li>✓ Support prioritaire</li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="mt-8 block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Essai gratuit 14 jours
              </Link>
            </div>
            {/* Business */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Business</h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">49€</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>✓ Tout Pro inclus</li>
                <li>✓ SSO (Single Sign-On)</li>
                <li>✓ API d&apos;intégration</li>
                <li>✓ SLA garanti</li>
                <li>✓ Account manager dédié</li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="mt-8 block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== CTA FINAL ====== */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Prêt à simplifier vos signalements ?
          </h2>
          <p className="mt-4 text-gray-600">
            Créez votre compte en 30 secondes. Aucune carte bancaire requise.
          </p>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-10 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-gray-200 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Image
            src="/logo-notifeo.png"
            alt="Notifeo"
            width={1000}
            height={400}
            className="h-8 w-auto opacity-60"
          />
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Notifeo · HBVR · Tous droits réservés
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/legal" className="hover:text-gray-600">Mentions légales</a>
            <a href="/privacy" className="hover:text-gray-600">Confidentialité</a>
            <a href="mailto:contact@notifeo.fr" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

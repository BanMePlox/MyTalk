import AppLogo from '@/Components/AppLogo';
import { Head, Link } from '@inertiajs/react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const content = {
    es: {
        title: 'Términos de Servicio',
        updated: 'Última actualización: abril de 2026',
        sections: [
            {
                heading: '1. Descripción del servicio',
                body: 'MyTalk es una aplicación de mensajería en tiempo real desarrollada como proyecto personal de demostración. Se ofrece tal cual, sin garantías de disponibilidad continua ni de uso en producción a gran escala.',
            },
            {
                heading: '2. Uso aceptable',
                body: 'Al usar MyTalk aceptas no publicar contenido ilegal, ofensivo, difamatorio o que infrinja derechos de terceros. Queda prohibido el uso automatizado no autorizado, el spam o cualquier acción que comprometa la seguridad o el rendimiento del servicio.',
            },
            {
                heading: '3. Tu cuenta',
                body: 'Eres responsable de mantener la confidencialidad de tus credenciales y de toda la actividad realizada desde tu cuenta. Si detectas un acceso no autorizado, contáctanos inmediatamente.',
            },
            {
                heading: '4. Contenido del usuario',
                body: 'Conservas los derechos sobre el contenido que publicas. Al hacerlo, nos concedes una licencia limitada para almacenarlo y mostrarlo dentro de la plataforma con el único fin de prestar el servicio.',
            },
            {
                heading: '5. Limitación de responsabilidad',
                body: 'MyTalk se ofrece como proyecto de demostración. No nos hacemos responsables de pérdidas de datos, interrupciones del servicio ni daños derivados de su uso.',
            },
            {
                heading: '6. Modificaciones',
                body: 'Podemos actualizar estos términos en cualquier momento. Los cambios significativos se comunicarán con antelación razonable.',
            },
            {
                heading: '7. Contacto',
                body: 'Para cualquier consulta sobre estos términos, escríbenos a pedrojimenezlujan1@gmail.com.',
            },
        ],
    },
    en: {
        title: 'Terms of Service',
        updated: 'Last updated: April 2026',
        sections: [
            {
                heading: '1. Description of service',
                body: 'MyTalk is a real-time messaging application developed as a personal demonstration project. It is provided as-is, without guarantees of continuous availability or large-scale production use.',
            },
            {
                heading: '2. Acceptable use',
                body: 'By using MyTalk you agree not to post illegal, offensive, defamatory content or content that infringes third-party rights. Unauthorized automated use, spam, or any action that compromises the security or performance of the service is prohibited.',
            },
            {
                heading: '3. Your account',
                body: 'You are responsible for maintaining the confidentiality of your credentials and for all activity carried out from your account. If you detect unauthorized access, contact us immediately.',
            },
            {
                heading: '4. User content',
                body: 'You retain ownership of the content you post. By posting it, you grant us a limited license to store and display it within the platform solely for the purpose of providing the service.',
            },
            {
                heading: '5. Limitation of liability',
                body: 'MyTalk is provided as a demonstration project. We are not liable for data loss, service interruptions, or damages arising from its use.',
            },
            {
                heading: '6. Changes',
                body: 'We may update these terms at any time. Significant changes will be communicated with reasonable notice.',
            },
            {
                heading: '7. Contact',
                body: 'For any questions about these terms, write to us at pedrojimenezlujan1@gmail.com.',
            },
        ],
    },
};

export default function Terms({ locale = 'es' }) {
    const lang = content[locale] ?? content.es;
    const other = locale === 'es' ? 'en' : 'es';

    return (
        <>
            <Head title={`${lang.title} — MyTalk`} />
            <div className="min-h-screen bg-bg text-text overflow-y-auto" style={isTauri ? { paddingTop: '2rem' } : {}}>
                <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
                    <Link href={route('home')} className="flex items-center gap-2">
                        <AppLogo className="h-8 w-8 object-contain" />
                        <span className="font-semibold text-lg">MyTalk</span>
                    </Link>
                    <a
                        href={route('terms', other)}
                        className="text-text-muted hover:text-text text-sm transition"
                    >
                        {other === 'en' ? 'English' : 'Español'}
                    </a>
                </nav>

                <div className="max-w-2xl mx-auto px-6 py-12">
                    <h1 className="text-3xl font-bold mb-2">{lang.title}</h1>
                    <p className="text-text-muted text-sm mb-10">{lang.updated}</p>

                    <div className="space-y-8">
                        {lang.sections.map((s) => (
                            <section key={s.heading}>
                                <h2 className="text-lg font-semibold mb-2">{s.heading}</h2>
                                <p className="text-text-secondary leading-relaxed">{s.body}</p>
                            </section>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm text-text-muted">
                        <Link href={route('privacy', locale)} className="hover:text-text transition">
                            {locale === 'es' ? 'Política de privacidad' : 'Privacy Policy'}
                        </Link>
                        <Link href={route('login')} className="hover:text-text transition">
                            {locale === 'es' ? 'Volver al inicio' : 'Back to login'}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

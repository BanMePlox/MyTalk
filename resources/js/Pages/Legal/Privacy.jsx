import { Head, Link } from '@inertiajs/react';

const content = {
    es: {
        title: 'Política de Privacidad',
        updated: 'Última actualización: abril de 2026',
        sections: [
            {
                heading: '1. Responsable del tratamiento',
                body: 'Pedro Jiménez — pedrojimenezlujan1@gmail.com. MyTalk es un proyecto personal de demostración, no una empresa.',
            },
            {
                heading: '2. Datos que recogemos',
                body: 'Cuando te registras con un proveedor externo (GitHub, Google o LinkedIn), recibimos tu nombre, dirección de correo electrónico y foto de perfil pública facilitados por dicho proveedor. Si te registras manualmente, recogemos el nombre de usuario, el correo electrónico y la contraseña (almacenada con hash bcrypt). Opcionalmente puedes añadir una biografía, color de banner y estado personalizado.',
            },
            {
                heading: '3. Finalidad del tratamiento',
                body: 'Los datos se usan exclusivamente para identificarte dentro de la plataforma, mostrarte en conversaciones y canales, y permitirte iniciar sesión. No realizamos perfilado ni decisiones automatizadas.',
            },
            {
                heading: '4. Base legal',
                body: 'El tratamiento se basa en la ejecución del contrato de uso del servicio (art. 6.1.b RGPD) y, en su caso, en tu consentimiento al iniciar sesión mediante un proveedor externo.',
            },
            {
                heading: '5. Compartición de datos',
                body: 'No vendemos ni cedemos tus datos personales a terceros. Los únicos terceros que intervienen son los proveedores de autenticación OAuth que tú eliges usar (GitHub, Google, LinkedIn), sujetos a sus propias políticas de privacidad.',
            },
            {
                heading: '6. Conservación',
                body: 'Tus datos se conservan mientras mantengas una cuenta activa. Puedes solicitar la eliminación de tu cuenta en cualquier momento escribiendo a pedrojimenezlujan1@gmail.com, y procederemos a borrar tus datos en un plazo de 30 días.',
            },
            {
                heading: '7. Tus derechos',
                body: 'Tienes derecho de acceso, rectificación, supresión, portabilidad y oposición al tratamiento de tus datos. Para ejercerlos, contáctanos en pedrojimenezlujan1@gmail.com.',
            },
            {
                heading: '8. Cookies',
                body: 'Solo utilizamos cookies de sesión estrictamente necesarias para mantener tu inicio de sesión. No usamos cookies de seguimiento ni publicidad.',
            },
            {
                heading: '9. Seguridad',
                body: 'Las contraseñas se almacenan con hash bcrypt. Las comunicaciones se realizan mediante HTTPS. Aplicamos medidas técnicas razonables para proteger tus datos, aunque ningún sistema es completamente infalible.',
            },
            {
                heading: '10. Contacto',
                body: 'Para cualquier consulta sobre privacidad o para ejercer tus derechos, escríbenos a pedrojimenezlujan1@gmail.com.',
            },
        ],
    },
    en: {
        title: 'Privacy Policy',
        updated: 'Last updated: April 2026',
        sections: [
            {
                heading: '1. Data controller',
                body: 'Pedro Jiménez — pedrojimenezlujan1@gmail.com. MyTalk is a personal demonstration project, not a company.',
            },
            {
                heading: '2. Data we collect',
                body: 'When you sign up using an external provider (GitHub, Google or LinkedIn), we receive your name, email address and public profile picture provided by that service. If you register manually, we collect your username, email address and password (stored as a bcrypt hash). Optionally you may add a bio, banner colour and custom status.',
            },
            {
                heading: '3. Purpose of processing',
                body: 'Data is used exclusively to identify you within the platform, display you in conversations and channels, and allow you to sign in. We do not carry out profiling or automated decision-making.',
            },
            {
                heading: '4. Legal basis',
                body: 'Processing is based on the performance of the service agreement (Art. 6.1.b GDPR) and, where applicable, your consent when signing in via an external provider.',
            },
            {
                heading: '5. Data sharing',
                body: 'We do not sell or share your personal data with third parties. The only third parties involved are the OAuth authentication providers you choose to use (GitHub, Google, LinkedIn), subject to their own privacy policies.',
            },
            {
                heading: '6. Retention',
                body: 'Your data is kept for as long as you maintain an active account. You may request account deletion at any time by writing to pedrojimenezlujan1@gmail.com, and we will delete your data within 30 days.',
            },
            {
                heading: '7. Your rights',
                body: 'You have the right to access, rectify, erase, port and object to the processing of your data. To exercise these rights, contact us at pedrojimenezlujan1@gmail.com.',
            },
            {
                heading: '8. Cookies',
                body: 'We only use strictly necessary session cookies to keep you signed in. We do not use tracking or advertising cookies.',
            },
            {
                heading: '9. Security',
                body: 'Passwords are stored as bcrypt hashes. Communications are made over HTTPS. We apply reasonable technical measures to protect your data, though no system is completely infallible.',
            },
            {
                heading: '10. Contact',
                body: 'For any privacy queries or to exercise your rights, write to us at pedrojimenezlujan1@gmail.com.',
            },
        ],
    },
};

export default function Privacy({ locale = 'es' }) {
    const lang = content[locale] ?? content.es;
    const other = locale === 'es' ? 'en' : 'es';

    return (
        <>
            <Head title={`${lang.title} — MyTalk`} />
            <div className="min-h-screen bg-gray-900 text-white">
                {/* Nav */}
                <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
                    <Link href={route('home')} className="flex items-center gap-2">
                        <img src="/images/MyTalk.png" alt="MyTalk" className="w-8 h-8 rounded-lg object-contain" />
                        <span className="font-semibold text-lg">MyTalk</span>
                    </Link>
                    <a
                        href={route('privacy', other)}
                        className="text-white/40 hover:text-white/70 text-sm transition"
                    >
                        {other === 'en' ? 'English' : 'Español'}
                    </a>
                </nav>

                {/* Content */}
                <div className="max-w-2xl mx-auto px-6 py-12">
                    <h1 className="text-3xl font-bold mb-2">{lang.title}</h1>
                    <p className="text-white/40 text-sm mb-10">{lang.updated}</p>

                    <div className="space-y-8">
                        {lang.sections.map((s) => (
                            <section key={s.heading}>
                                <h2 className="text-lg font-semibold mb-2">{s.heading}</h2>
                                <p className="text-white/60 leading-relaxed">{s.body}</p>
                            </section>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/40">
                        <Link href={route('terms', locale)} className="hover:text-white/70 transition">
                            {locale === 'es' ? 'Términos de servicio' : 'Terms of Service'}
                        </Link>
                        <Link href={route('login')} className="hover:text-white/70 transition">
                            {locale === 'es' ? 'Volver al inicio' : 'Back to login'}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

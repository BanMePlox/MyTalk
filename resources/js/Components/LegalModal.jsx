import { usePage } from '@inertiajs/react';

const content = {
    terms: {
        es: {
            title: 'Términos de Servicio',
            updated: 'Última actualización: abril de 2026',
            sections: [
                { heading: '1. Descripción del servicio', body: 'MyTalk es una aplicación de mensajería en tiempo real desarrollada como proyecto personal de demostración. Se ofrece tal cual, sin garantías de disponibilidad continua ni de uso en producción a gran escala.' },
                { heading: '2. Uso aceptable', body: 'Al usar MyTalk aceptas no publicar contenido ilegal, ofensivo, difamatorio o que infrinja derechos de terceros. Queda prohibido el uso automatizado no autorizado, el spam o cualquier acción que comprometa la seguridad o el rendimiento del servicio.' },
                { heading: '3. Tu cuenta', body: 'Eres responsable de mantener la confidencialidad de tus credenciales y de toda la actividad realizada desde tu cuenta. Si detectas un acceso no autorizado, contáctanos inmediatamente.' },
                { heading: '4. Contenido del usuario', body: 'Conservas los derechos sobre el contenido que publicas. Al hacerlo, nos concedes una licencia limitada para almacenarlo y mostrarlo dentro de la plataforma con el único fin de prestar el servicio.' },
                { heading: '5. Limitación de responsabilidad', body: 'MyTalk se ofrece como proyecto de demostración. No nos hacemos responsables de pérdidas de datos, interrupciones del servicio ni daños derivados de su uso.' },
                { heading: '6. Modificaciones', body: 'Podemos actualizar estos términos en cualquier momento. Los cambios significativos se comunicarán con antelación razonable.' },
                { heading: '7. Contacto', body: 'Para cualquier consulta sobre estos términos, escríbenos a pedrojimenezlujan1@gmail.com.' },
            ],
        },
        en: {
            title: 'Terms of Service',
            updated: 'Last updated: April 2026',
            sections: [
                { heading: '1. Description of service', body: 'MyTalk is a real-time messaging application developed as a personal demonstration project. It is provided as-is, without guarantees of continuous availability or large-scale production use.' },
                { heading: '2. Acceptable use', body: 'By using MyTalk you agree not to post illegal, offensive, defamatory content or content that infringes third-party rights. Unauthorized automated use, spam, or any action that compromises the security or performance of the service is prohibited.' },
                { heading: '3. Your account', body: 'You are responsible for maintaining the confidentiality of your credentials and for all activity carried out from your account. If you detect unauthorized access, contact us immediately.' },
                { heading: '4. User content', body: 'You retain ownership of the content you post. By posting it, you grant us a limited license to store and display it within the platform solely for the purpose of providing the service.' },
                { heading: '5. Limitation of liability', body: 'MyTalk is provided as a demonstration project. We are not liable for data loss, service interruptions, or damages arising from its use.' },
                { heading: '6. Changes', body: 'We may update these terms at any time. Significant changes will be communicated with reasonable notice.' },
                { heading: '7. Contact', body: 'For any questions about these terms, write to us at pedrojimenezlujan1@gmail.com.' },
            ],
        },
    },
    privacy: {
        es: {
            title: 'Política de Privacidad',
            updated: 'Última actualización: abril de 2026',
            sections: [
                { heading: '1. Responsable del tratamiento', body: 'Pedro Jiménez — pedrojimenezlujan1@gmail.com. MyTalk es un proyecto personal de demostración, no una empresa.' },
                { heading: '2. Datos que recogemos', body: 'Cuando te registras con un proveedor externo (GitHub, Google o LinkedIn), recibimos tu nombre, dirección de correo electrónico y foto de perfil pública. Si te registras manualmente, recogemos el nombre de usuario, el correo electrónico y la contraseña (almacenada con hash bcrypt).' },
                { heading: '3. Finalidad del tratamiento', body: 'Los datos se usan exclusivamente para identificarte dentro de la plataforma, mostrarte en conversaciones y canales, y permitirte iniciar sesión. No realizamos perfilado ni decisiones automatizadas.' },
                { heading: '4. Base legal', body: 'El tratamiento se basa en la ejecución del contrato de uso del servicio (art. 6.1.b RGPD) y, en su caso, en tu consentimiento al iniciar sesión mediante un proveedor externo.' },
                { heading: '5. Compartición de datos', body: 'No vendemos ni cedemos tus datos personales a terceros. Los únicos terceros que intervienen son los proveedores de autenticación OAuth que tú eliges usar, sujetos a sus propias políticas.' },
                { heading: '6. Conservación', body: 'Tus datos se conservan mientras mantengas una cuenta activa. Puedes solicitar la eliminación en cualquier momento escribiendo a pedrojimenezlujan1@gmail.com.' },
                { heading: '7. Tus derechos', body: 'Tienes derecho de acceso, rectificación, supresión, portabilidad y oposición al tratamiento. Contáctanos en pedrojimenezlujan1@gmail.com.' },
                { heading: '8. Cookies', body: 'Solo utilizamos cookies de sesión estrictamente necesarias para mantener tu inicio de sesión. No usamos cookies de seguimiento ni publicidad.' },
                { heading: '9. Seguridad', body: 'Las contraseñas se almacenan con hash bcrypt. Las comunicaciones se realizan mediante HTTPS. Aplicamos medidas técnicas razonables para proteger tus datos.' },
                { heading: '10. Contacto', body: 'Para cualquier consulta sobre privacidad, escríbenos a pedrojimenezlujan1@gmail.com.' },
            ],
        },
        en: {
            title: 'Privacy Policy',
            updated: 'Last updated: April 2026',
            sections: [
                { heading: '1. Data controller', body: 'Pedro Jiménez — pedrojimenezlujan1@gmail.com. MyTalk is a personal demonstration project, not a company.' },
                { heading: '2. Data we collect', body: 'When you sign up using an external provider (GitHub, Google or LinkedIn), we receive your name, email address and public profile picture. If you register manually, we collect your username, email address and password (stored as a bcrypt hash).' },
                { heading: '3. Purpose of processing', body: 'Data is used exclusively to identify you within the platform, display you in conversations and channels, and allow you to sign in. We do not carry out profiling or automated decision-making.' },
                { heading: '4. Legal basis', body: 'Processing is based on the performance of the service agreement (Art. 6.1.b GDPR) and, where applicable, your consent when signing in via an external provider.' },
                { heading: '5. Data sharing', body: 'We do not sell or share your personal data with third parties. The only third parties involved are the OAuth providers you choose to use, subject to their own privacy policies.' },
                { heading: '6. Retention', body: 'Your data is kept for as long as you maintain an active account. You may request deletion at any time by writing to pedrojimenezlujan1@gmail.com.' },
                { heading: '7. Your rights', body: 'You have the right to access, rectify, erase, port and object to the processing of your data. Contact us at pedrojimenezlujan1@gmail.com.' },
                { heading: '8. Cookies', body: 'We only use strictly necessary session cookies to keep you signed in. We do not use tracking or advertising cookies.' },
                { heading: '9. Security', body: 'Passwords are stored as bcrypt hashes. Communications are made over HTTPS. We apply reasonable technical measures to protect your data.' },
                { heading: '10. Contact', body: 'For any privacy queries, write to us at pedrojimenezlujan1@gmail.com.' },
            ],
        },
    },
};

export default function LegalModal({ type, onClose }) {
    let locale = 'es';
    try { locale = usePage().props.locale ?? 'es'; } catch {}

    const lang = content[type]?.[locale] ?? content[type]?.es;
    if (!lang) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center px-4" onClick={onClose}>
            <div className="absolute inset-0 overlay-backdrop" />
            <div
                className="relative bg-bg-elevated rounded border border-border w-full max-w-lg flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-text font-semibold">{lang.title}</h2>
                        <p className="text-text-muted text-xs mt-0.5">{lang.updated}</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text transition ml-4">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5 space-y-5">
                    {lang.sections.map(s => (
                        <div key={s.heading}>
                            <h3 className="text-sm font-semibold text-text mb-1">{s.heading}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

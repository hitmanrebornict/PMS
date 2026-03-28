import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, MessageCircle, Mail, MapPin, Clock, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

function QrModal({ open, onClose, title, imgSrc }: { open: boolean; onClose: () => void; title: string; imgSrc: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface-lowest rounded-[0.5rem] p-6 md:p-8 max-w-sm w-full"
            style={{
              boxShadow: '0 10px 30px rgba(48, 51, 47, 0.12), 0 4px 8px rgba(48, 51, 47, 0.06)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-on-surface/40 hover:text-on-surface transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="font-display font-600 text-lg text-on-surface mb-4 text-center break-all">
              {title}
            </h3>
            <img
              src={imgSrc}
              alt={title}
              className="w-full max-w-[280px] mx-auto rounded-[0.25rem]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ContactSection() {
  const { t } = useLanguage();
  const c = translations.contact;
  const [qrModal, setQrModal] = useState<'wechat' | 'xhs' | null>(null);

  return (
    <section id="contact" className="bg-surface py-20 md:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-12 md:mb-20"
        >
          <h2 className="font-display font-700 text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-tight">
            {t(c.title)}
          </h2>
          <p className="mt-4 font-body text-sm sm:text-base md:text-lg text-on-surface/60 leading-relaxed">
            {t(c.subtitle)}
          </p>
          <p className="mt-2 font-display font-600 text-base sm:text-lg text-primary">
            {c.companyName}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Column 1: Contact channels */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface-lowest rounded-[0.5rem] p-6 sm:p-8 md:p-10 space-y-6"
            style={{
              boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
            }}
          >
            {/* WeChat — first priority */}
            <button
              onClick={() => setQrModal('wechat')}
              className="flex items-center gap-3 sm:gap-4 w-full text-left group cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[0.375rem] bg-[#07c160]/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#07c160]" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 00.186-.059l1.893-1.085a.847.847 0 01.415-.131.82.82 0 01.243.037 10.57 10.57 0 002.887.397c.322 0 .638-.022.952-.05a5.232 5.232 0 01-.218-1.478c0-3.539 3.326-6.412 7.428-6.412.346 0 .685.027 1.019.065C16.192 4.87 12.755 2.188 8.691 2.188zm-2.07 4.22a1.108 1.108 0 110 2.216 1.108 1.108 0 010-2.217zm4.737 0a1.108 1.108 0 110 2.216 1.108 1.108 0 010-2.217zM16.653 9.95c-3.564 0-6.455 2.507-6.455 5.6 0 3.092 2.891 5.6 6.455 5.6.724 0 1.422-.105 2.078-.294a.65.65 0 01.196-.03.696.696 0 01.345.108l1.428.82a.268.268 0 00.147.047c.128 0 .233-.105.233-.236 0-.058-.023-.113-.038-.17l-.298-1.132a.478.478 0 01-.02-.14.476.476 0 01.173-.374C22.78 18.794 23.108 17.28 23.108 15.55c0-3.093-2.891-5.6-6.455-5.6zm-1.96 3.293a.913.913 0 110 1.826.913.913 0 010-1.826zm3.92 0a.913.913 0 110 1.826.913.913 0 010-1.826z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-body text-xs text-on-surface/50">{t(c.wechat.title)}</div>
                <div className="font-body text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                  {c.wechat.id}
                </div>
                <div className="font-body text-xs text-primary/60 mt-0.5">{t(c.scanToConnect)}</div>
              </div>
            </button>

            {/* WhatsApp */}
            <a
              href={c.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 sm:gap-4 group min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[0.375rem] bg-[#25d366]/10 flex items-center justify-center shrink-0">
                <MessageCircle size={20} className="text-[#25d366]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="font-body text-xs text-on-surface/50">{c.whatsapp.title}</div>
                <div className="font-body text-sm text-on-surface group-hover:text-primary transition-colors">
                  {c.whatsapp.value}
                </div>
              </div>
            </a>

            {/* Phone */}
            <a href={c.phone.link} className="flex items-center gap-3 sm:gap-4 group min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[0.375rem] bg-primary-container/50 flex items-center justify-center shrink-0">
                <Phone size={20} className="text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="font-body text-xs text-on-surface/50">{t(c.phone.title)}</div>
                <div className="font-body text-sm text-on-surface group-hover:text-primary transition-colors">
                  {c.phone.value}
                </div>
              </div>
            </a>

            {/* Email */}
            <a href={c.email.link} className="flex items-center gap-3 sm:gap-4 group min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[0.375rem] bg-primary-container/50 flex items-center justify-center shrink-0">
                <Mail size={20} className="text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="font-body text-xs text-on-surface/50">{t(c.email.title)}</div>
                <div className="font-body text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors break-all">
                  {c.email.value}
                </div>
              </div>
            </a>

            {/* XHS / RedNote */}
            <button
              onClick={() => setQrModal('xhs')}
              className="flex items-center gap-3 sm:gap-4 w-full text-left group cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[0.375rem] bg-[#ff2442]/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#ff2442]" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.636 5.818h-1.637c-.182 0-.364.182-.364.364v1.636h2.001l-.182 2.001h-1.818v5.454h-2.182v-5.454H9.636v-2.001h1.818V8.182c0-1.636 1.091-2.727 2.727-2.727h1.455v2.363z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-body text-xs text-on-surface/50">{t(c.xiaohongshu.title)}</div>
                <div className="font-body text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                  {c.xiaohongshu.id}
                </div>
                <div className="font-body text-xs text-primary/60 mt-0.5">{t(c.scanToConnect)}</div>
              </div>
            </button>
          </motion.div>

          {/* Column 2: Location & Hours */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface-lowest rounded-[0.5rem] p-6 sm:p-8 md:p-10 space-y-7"
            style={{
              boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
            }}
          >
            {/* Locations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-primary shrink-0" strokeWidth={1.5} />
                <h3 className="font-display font-600 text-base text-on-surface">
                  {t(c.locations.title)}
                </h3>
              </div>
              <div className="space-y-1.5 ml-6">
                {c.locations.list.map((loc) => (
                  <div key={loc} className="font-body text-sm text-on-surface/70">
                    {loc}
                  </div>
                ))}
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-primary shrink-0" strokeWidth={1.5} />
                <h3 className="font-display font-600 text-base text-on-surface">
                  {t(c.hours.title)}
                </h3>
              </div>
              <div className="ml-6 font-body text-sm text-on-surface/70">
                {t(c.hours.value)}
              </div>
            </div>

            {/* Address */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-primary shrink-0" strokeWidth={1.5} />
                <h3 className="font-display font-600 text-base text-on-surface">
                  {t(c.address.title)}
                </h3>
              </div>
              <div className="ml-6 space-y-0.5">
                {c.address.lines.map((line) => (
                  <div key={line} className="font-body text-sm text-on-surface/70">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Column 3: QR Codes */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6"
          >
            {/* WeChat QR */}
            <div
              className="bg-surface-lowest rounded-[0.5rem] p-4 sm:p-6 text-center cursor-pointer"
              onClick={() => setQrModal('wechat')}
              style={{
                boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
              }}
            >
              <img
                src="/wechat-qr.png"
                alt="WeChat QR Code"
                className="w-28 h-28 sm:w-40 sm:h-40 mx-auto rounded-[0.25rem] object-contain"
              />
              <div className="mt-2 sm:mt-3 font-display font-600 text-xs sm:text-sm text-on-surface">
                {t(c.wechat.title)}
              </div>
              <div className="font-body text-xs text-on-surface/50 mt-0.5">
                {t(c.scanToConnect)}
              </div>
            </div>

            {/* XHS QR */}
            <div
              className="bg-surface-lowest rounded-[0.5rem] p-4 sm:p-6 text-center cursor-pointer"
              onClick={() => setQrModal('xhs')}
              style={{
                boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
              }}
            >
              <img
                src="/xhs-qr.png"
                alt="XHS RedNote QR Code"
                className="w-28 h-28 sm:w-40 sm:h-40 mx-auto rounded-[0.25rem] object-contain"
              />
              <div className="mt-2 sm:mt-3 font-display font-600 text-xs sm:text-sm text-on-surface">
                {t(c.xiaohongshu.title)}
              </div>
              <div className="font-body text-xs text-on-surface/50 mt-0.5">
                {t(c.scanToConnect)}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* QR Modals */}
      <QrModal
        open={qrModal === 'wechat'}
        onClose={() => setQrModal(null)}
        title={`${t(c.wechat.title)} — ${c.wechat.id}`}
        imgSrc="/wechat-qr.png"
      />
      <QrModal
        open={qrModal === 'xhs'}
        onClose={() => setQrModal(null)}
        title={`${t(c.xiaohongshu.title)} — ${c.xiaohongshu.id}`}
        imgSrc="/xhs-qr.png"
      />
    </section>
  );
}

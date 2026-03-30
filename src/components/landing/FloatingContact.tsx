import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle } from 'lucide-react';
import translations from '../../i18n/translations';

function WeChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
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
            <h3 className="font-display font-600 text-lg text-on-surface mb-1 text-center">
              WeChat
            </h3>
            <p className="font-body text-sm text-on-surface/50 text-center mb-4">
              {translations.contact.wechat.id}
            </p>
            <img
              src="/wechat-qr.png"
              alt="WeChat QR Code"
              className="w-full max-w-[240px] mx-auto rounded-[0.25rem]"
            />
            <p className="font-body text-xs text-on-surface/40 text-center mt-3">
              Scan to connect on WeChat
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FloatingContact() {
  const [showWeChat, setShowWeChat] = useState(false);
  const whatsappLink = translations.contact.whatsapp.link;

  return (
    <>
      {/* Floating buttons — fixed to bottom-right */}
      <div className="fixed right-5 bottom-8 z-[150] flex flex-col items-center gap-3">
        {/* WeChat */}
        <motion.button
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShowWeChat(true)}
          title="WeChat"
          className="w-12 h-12 rounded-full bg-[#07c160] flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
          style={{ boxShadow: '0 4px 16px rgba(7, 193, 96, 0.4)' }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 00.186-.059l1.893-1.085a.847.847 0 01.415-.131.82.82 0 01.243.037 10.57 10.57 0 002.887.397c.322 0 .638-.022.952-.05a5.232 5.232 0 01-.218-1.478c0-3.539 3.326-6.412 7.428-6.412.346 0 .685.027 1.019.065C16.192 4.87 12.755 2.188 8.691 2.188zm-2.07 4.22a1.108 1.108 0 110 2.216 1.108 1.108 0 010-2.217zm4.737 0a1.108 1.108 0 110 2.216 1.108 1.108 0 010-2.217zM16.653 9.95c-3.564 0-6.455 2.507-6.455 5.6 0 3.092 2.891 5.6 6.455 5.6.724 0 1.422-.105 2.078-.294a.65.65 0 01.196-.03.696.696 0 01.345.108l1.428.82a.268.268 0 00.147.047c.128 0 .233-.105.233-.236 0-.058-.023-.113-.038-.17l-.298-1.132a.478.478 0 01-.02-.14.476.476 0 01.173-.374C22.78 18.794 23.108 17.28 23.108 15.55c0-3.093-2.891-5.6-6.455-5.6zm-1.96 3.293a.913.913 0 110 1.826.913.913 0 010-1.826zm3.92 0a.913.913 0 110 1.826.913.913 0 010-1.826z" />
          </svg>
        </motion.button>

        {/* WhatsApp */}
        <motion.a
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.95, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)' }}
        >
          <MessageCircle size={22} className="text-white" strokeWidth={1.75} />
        </motion.a>
      </div>

      {/* WeChat QR modal */}
      <WeChatModal open={showWeChat} onClose={() => setShowWeChat(false)} />
    </>
  );
}

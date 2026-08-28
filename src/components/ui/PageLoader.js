import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import faviconImg from '@/assets/favicon.png';
const PageLoader = ({ text = 'Loading...' }) => {
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, className: "absolute inset-0 flex flex-col items-center justify-center bg-[#fdf1ee]/80 backdrop-blur-[2px] z-50", children: [_jsxs("div", { className: "relative flex items-center justify-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" }), _jsx("img", { src: faviconImg, alt: "Loading", className: "absolute w-8 h-8 object-contain animate-pulse" })] }), text && (_jsx("p", { className: "text-[10px] font-bold text-orange-500/70 uppercase tracking-widest mt-4", children: text }))] }, "page-loader"));
};
export default PageLoader;

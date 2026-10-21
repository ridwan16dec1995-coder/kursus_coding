# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

1. Deploy backend Flask ke Render.
2. Deploy frontend React sebagai static site.
3. Mengisi environment variables production.
4. Mengubah VITE_API_BASE_URL ke URL backend Render.
5. Mengubah CORS_ALLOWED_ORIGINS ke URL frontend online.
6. Menjalankan migration PostgreSQL Neon.
7. Menguji login admin, siswa, kursus, dan nilai dari URL publik.
Jadi status sekarang: database sudah online, aplikasi belum online.
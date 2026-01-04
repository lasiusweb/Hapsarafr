# Project Overview: Hapsara Farmer Registration

This project, named "Hapsara Farmer Registration," is a comprehensive React-based platform designed for managing various aspects of agricultural operations, with a strong focus on farmer registration, data management, and a wide array of agricultural services. It is built to support an offline-first experience using WatermelonDB for local data storage and integrates with Supabase for backend services, including authentication and cloud data. The application leverages Google's Gemini API for AI capabilities, as indicated by the `@google/genai` dependency.

The application features a rich set of modules and pages covering functionalities such as:
*   **Farmer Management:** Directory, details, registration, ID verification, geo-management.
*   **Data & Analytics:** Dashboards, reports, data health, schema management, usage analytics, financial dashboards, satellite analysis, yield prediction, sustainability.
*   **Operational Management:** Task management, resource management, distribution reports, equipment management, processing.
*   **Community & Support:** Community forum, mentorship, farmer advisory, assistance schemes, resource library, events, field service.
*   **Commerce & Billing:** Marketplace, product listing, vendor management, checkout, order confirmation, billing, subscription management, agri-store.
*   **Specialized Dashboards:** Caelus, Hapsara Nexus, StateCraft, FamilyShield, Realty, Mitra, Samridhi, Genetica, Performance Tracker, Commoditex.

## Key Technologies Used:
*   **Frontend Framework:** React
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Routing:** React Router DOM (`react-router-dom`)
*   **Offline-first Database:** WatermelonDB (`@nozbe/watermelondb`)
*   **Backend Services:** Supabase (`@supabase/supabase-js`)
*   **AI Integration:** Google Gemini API (`@google/genai`)
*   **Date Manipulation:** `date-fns`
*   **PDF Generation/Image Manipulation:** `jspdf`, `html2canvas`
*   **Mapping:** `leaflet`
*   **Spreadsheet Processing:** `xlsx`
*   **Utility Libraries:** `clsx`, `tailwind-merge`, `dompurify`

## Building and Running Locally:

### Prerequisites:
*   Node.js (LTS version recommended)

### Setup Steps:
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment Variables:**
    Create a file named `.env.local` in the project root. Add your Gemini API key to this file:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```
    *   **Note:** The application also relies on Supabase credentials (URL and Anon Key) which are managed via `localStorage` and initialized by `lib/supabase.ts`. These may need to be set up through the application's UI or manual `localStorage` entry if not provided.
3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, usually accessible at `http://localhost:5173`.

### Production Build:
To create a production-ready build of the application:
```bash
npm run build
```
This command compiles the TypeScript code and bundles the assets into the `dist` directory.

## Development Conventions:

*   **Language:** The entire project is written in TypeScript, ensuring type safety and better maintainability.
*   **Styling:** Tailwind CSS is used for a utility-first CSS approach, allowing for rapid UI development and consistent design.
*   **Component Structure:** Components are organized within the `components/` directory. Many larger components and pages are lazy-loaded to optimize initial bundle size and improve performance.
*   **Data Management Strategy:**
    *   **Local Data:** WatermelonDB provides an observable, offline-first database solution for persistent local data storage.
    *   **Cloud Integration:** Supabase is used as the primary backend for authentication, cloud database, and potentially other services.
*   **Routing:** The application uses `react-router-dom` with `HashRouter` for client-side routing.
*   **State Management:** State is managed locally within components, and globally through React Context (e.g., `DatabaseContext`, `CartContext`) and observable patterns from WatermelonDB.
*   **Environment Variables:** Vite's `loadEnv` mechanism is utilized to securely inject environment variables, ensuring that sensitive keys like `API_KEY` are handled correctly during the build process.
*   **Security Features:** A "kill switch" mechanism is implemented in `App.tsx` that automatically resets the local database and clears `localStorage` after a prolonged period of inactivity (30 days), enhancing data security.

This `GEMINI.md` file provides an overview of the project, its technical stack, how to run it, and key development practices.

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

## Inferred Architectural Components and Practices (Based on additional snippets):

Based on analysis of external code snippets provided to Gemini, the Hapsara application likely incorporates the following architectural components and development practices beyond the core React frontend:

### Python Backend (Inferred)
There are strong indications of a separate Python Flask backend coexisting with or complementing the React frontend and Supabase services. Key characteristics inferred are:
*   **Framework:** Flask
*   **Database:** Likely utilizes SQLite or PostgreSQL via SQLAlchemy (given mentions of `SQLALCHEMY_DATABASE_URI`).
*   **Middleware:** Implements robust security measures including CSRF protection (potentially with Flask-WTF), comprehensive CORS handling, and Content Security Policy (CSP) headers.
*   **Real-time Communication:** Features Socket.IO integration, suggesting real-time functionalities like chat, notifications, or collaborative tools.
*   **File Serving:** Capable of serving files, potentially for static assets, user uploads, or documentation.
*   **Initialization:** Employs a structured `AppInitializer` for managing application paths, environment variables (`.env`), and database configuration, indicating a well-organized Python project structure for backend services or CLI tools.
*   **Role:** This backend likely handles complex business logic, data processing, integrations with external systems, or provides APIs that are not directly served by Supabase.

### Deployment Strategy (Inferred)
The presence of a Kubernetes manifest generation tool suggests a sophisticated, containerized deployment strategy for the Hapsara application's various components.
*   **Containerization:** Both the React frontend (after `npm run build`) and the Python Flask backend would likely be deployed as Docker containers.
*   **Orchestration:** Kubernetes is used for orchestrating these containers, managing deployments, services, and scaling.
*   **Manifests:** The `generate_app_manifest` tool is used to create deployment and service YAML files, defining application resources, image URIs, port mappings, resource requests (CPU, memory), replica counts, namespaces, and load balancer schemes (e.g., internal/external).
*   **CI/CD Integration:** This setup implies an automated CI/CD pipeline that builds container images, generates/updates Kubernetes manifests, and deploys them to a Kubernetes cluster.

### Modular Application Management (Frontend - Inferred)
The frontend likely supports a modular architecture where various "sub-applications" or features can be dynamically managed.
*   **Dynamic Registration:** A mechanism exists (`registerApplication`, `unregisterApplication`) to add, remove, or manage different application modules at runtime.
*   **User Interface:** The `ApplicationsPage` component is designed to display these registered applications in a user-friendly grid, showing titles, descriptions, and images, and allowing navigation (`router.push`) to them.
*   **Platform Approach:** This suggests Hapsara is not just a single monolithic application but potentially a platform capable of hosting and integrating multiple distinct, manageable features or external applications.

This `GEMINI.md` file provides an overview of the project, its technical stack, how to run it, key development practices, and inferred architectural patterns.

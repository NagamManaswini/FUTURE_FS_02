# Mini CRM - Lead Management System

A lightweight, responsive, full-stack Customer Relationship Management (CRM) application designed to capture, monitor, and optimize sales leads from a unified, intuitive interface.

## Features

*   System Dashboard: Real-time visual overview of database lead metrics, including total pipelines, conversion tracking metrics, and recent prospect activity logs.
*   Leads Database: Centralized data hub supporting complete CRUD actions (Create, Read, Update, Delete) alongside custom stage filtering (New, Contacted, Converted) and acquisition channel grouping.
*   Analytics & Reports: Detailed analytical tracking rendering monthly acquisition growth trends, pipeline stage bottlenecks, and acquisition channel breakdowns.
*   Robust Backend API: Secured Python-based RESTful API with isolated environment configuration and JWT structures for administrator role authorization.

---

##  Tech Stack

*   **Frontend:** HTML5, Tailwind CSS v3, FontAwesome Icons, JavaScript (Chart visualization engines)
*   **Backend:** Python, Flask / REST API framework
*   **Database:** MongoDB

---

##  Getting Started

### Prerequisites
* Python 3.x Installed
* MongoDB Server running locally (`mongodb://localhost:27017`)

### Installation & Setup

1. **Clone the repository:**
   git clone [https://github.com/NagamManaswini/FUTURE_FS_02.git](https://github.com/NagamManaswini/FUTURE_FS_02.git)
   cd FUTURE_FS_02
   Set up the Python Virtual Environment:

   # Activate your virtual environment (Windows PowerShell)
   .\.venv\Scripts\Activate.ps1
   Install dependencies:
   pip install -r backend/requirements.txt
   Environment Variables (Optional):
   Create a .env file in the project root to override default configuration parameters if necessary:
   Code snippet
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/mini_crm
   JWT_SECRET=your_secret_key
   Running the Application
1. Start the Backend API Server
Ensure your terminal is in the project root directory (MINI CRM) and your virtual environment is active, then run:
python -m backend.app

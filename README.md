# Dynamic Machine Data Management & Local Risk Prediction

A simple full-stack assessment project for dynamically configuring machine fields, managing machine records, and running a local Python machine-risk prediction model.

## Technologies

- Frontend: React + Vite + plain CSS
- Backend: Node.js + Express
- Database: MySQL
- ML service: Python + FastAPI + scikit-learn
- Communication: REST APIs
- ML model: Random Forest classifier

## Architecture

```text
React Web UI
    |
    | REST
    v
Node.js / Express
    |                 \
    | CRUD              | POST /predict
    v                    v
MySQL              Python FastAPI
                         |
                         v
                  scikit-learn model
                         |
                         v
                  Low / Medium / High
```

## Project structure

```text
machine-risk-management/
├── frontend/
├── backend/
├── ml-service/
├── database/
└── README.md
```

## Prerequisites

Install:

- Node.js 18+
- Python 3.10+
- MySQL 8+

## 1. Database setup

Create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

The schema uses an EAV-style `machine_values` table. Adding a new machine field therefore does not require adding a new database column.

If your MySQL credentials differ, create:

`backend/.env`

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=machine_risk
ML_SERVICE_URL=http://127.0.0.1:8000
```

## 2. Start the Python ML service

```bash
cd ml-service
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Train the local model:

```bash
python train_model.py
```

Start FastAPI:

```bash
uvicorn app:app --reload --port 8000
```

The ML service will be available at:

`http://127.0.0.1:8000`

Health check:

`GET http://127.0.0.1:8000/health`

## 3. Start the backend

Open another terminal:

```bash
cd backend
npm install
npm run dev
```

Backend:

`http://localhost:5000`

Health check:

`GET http://localhost:5000/api/health`

## 4. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally:

`http://localhost:5173`

## Application workflow

1. Open **Field Configuration**.
2. The initial fields are:
   - Machine Name - Text - Required
   - Temperature - Number - Required
   - Pressure - Number - Required
   - Vibration - Dropdown - Required
3. Add a field such as:
   - Humidity - Number - Optional
4. Open **Machine Records**.
5. The machine form automatically contains the newly configured field.
6. Create/edit/delete machine records.
7. Open **Risk Prediction**.
8. Select a machine and click **Predict Risk**.
9. The Node backend reads the machine data, extracts the three features currently supported by the model, calls the local Python service, and returns the result.

## Dynamic fields and the Humidity scenario

Machine field definitions are stored in `machine_fields`. Actual values are stored in `machine_values`.

Adding `Humidity` only creates a new field-definition row. The frontend renders it dynamically, and the backend stores its value without a schema migration.

The initial ML model uses:

- Temperature
- Pressure
- Vibration

Therefore, the existing model does **not** automatically use Humidity. Humidity can still be stored, edited, displayed, and passed through the application.

To make a future model use Humidity:

1. Collect training data containing Humidity.
2. Add Humidity to the training feature set.
3. Retrain the model.
4. Save/version the new model.
5. Update the Python prediction schema.
6. Update the backend mapping so Humidity is included in inference.
7. Test the new model before using it.

No automatic retraining is implemented because it is outside the assessment requirement.

## API overview

### Fields

```text
GET    /api/fields
POST   /api/fields
PUT    /api/fields/:id
DELETE /api/fields/:id
```

### Machines

```text
GET    /api/machines
GET    /api/machines/:id
POST   /api/machines
PUT    /api/machines/:id
DELETE /api/machines/:id
```

### Prediction

```text
POST   /api/machines/:id/predict
```

## Example prediction request

The Node backend calls the Python service with:

```json
{
  "temperature": 85,
  "pressure": 120,
  "vibration": "High"
}
```

Example response:

```json
{
  "risk_level": "High"
}
```

## Security

Do not commit:

- `.env`
- passwords
- API keys
- access tokens
- production credentials

This repository includes `.gitignore` entries for local secrets and virtual environments.

## Notes

This project is intentionally simple and assessment-focused. It is not intended as a production deployment.

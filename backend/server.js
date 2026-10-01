const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

function parseOptions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function normalizeField(row) {
  return {
    id: row.id,
    field_name: row.field_name,
    field_type: row.field_type,
    required: Boolean(row.is_required),
    options: parseOptions(row.options_json)
  };
}

async function getFields() {
  const [rows] = await pool.query(
    "SELECT * FROM machine_fields ORDER BY id ASC"
  );
  return rows.map(normalizeField);
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ---------------- Fields ----------------

app.get("/api/fields", async (req, res) => {
  try {
    res.json(await getFields());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/fields", async (req, res) => {
  try {
    const { field_name, field_type, required = false, options = [] } = req.body;

    if (!field_name || !["text", "number", "dropdown"].includes(field_type)) {
      return res.status(400).json({ message: "Invalid field name or type." });
    }

    if (field_type === "dropdown" && (!Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({ message: "Dropdown fields need at least one option." });
    }

    const [result] = await pool.query(
      `INSERT INTO machine_fields
       (field_name, field_type, is_required, options_json)
       VALUES (?, ?, ?, ?)`,
      [
        field_name.trim(),
        field_type,
        Boolean(required),
        field_type === "dropdown" ? JSON.stringify(options) : null
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM machine_fields WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(normalizeField(rows[0]));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A field with this name already exists." });
    }
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/fields/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
  return res.status(400).json({ message: "Invalid field ID." });
}
    const { field_name, field_type, required = false, options = [] } = req.body;

    if (!field_name || !["text", "number", "dropdown"].includes(field_type)) {
      return res.status(400).json({ message: "Invalid field name or type." });
    }

    if (field_type === "dropdown" && (!Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({ message: "Dropdown fields need at least one option." });
    }

    await pool.query(
      `UPDATE machine_fields
       SET field_name = ?, field_type = ?, is_required = ?, options_json = ?
       WHERE id = ?`,
      [
        field_name.trim(),
        field_type,
        Boolean(required),
        field_type === "dropdown" ? JSON.stringify(options) : null,
        id
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM machine_fields WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Field not found." });
    }

    res.json(normalizeField(rows[0]));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A field with this name already exists." });
    }
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/fields/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid field ID."
      });
    }

    // Check that the field exists
    const [fields] = await pool.query(
      "SELECT id, field_name FROM machine_fields WHERE id = ?",
      [id]
    );

    if (fields.length === 0) {
      return res.status(404).json({
        message: "Field not found."
      });
    }

    // Delete all machine values belonging to this field
    await pool.query(
      "DELETE FROM machine_values WHERE field_id = ?",
      [id]
    );

    // Delete the field itself
    const [result] = await pool.query(
      "DELETE FROM machine_fields WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Field not found."
      });
    }

    res.json({
      message: `Field "${fields[0].field_name}" deleted successfully.`
    });

  } catch (error) {
    console.error("Delete field error:", error);

    res.status(500).json({
      message: error.message
    });
  }
});
// ---------------- Machines ----------------

async function getMachineById(id) {
  const [machineRows] = await pool.query(
    "SELECT id, created_at, updated_at FROM machines WHERE id = ?",
    [id]
  );

  if (!machineRows.length) return null;

  const [valueRows] = await pool.query(
    `SELECT mv.field_id, mv.field_value
     FROM machine_values mv
     WHERE mv.machine_id = ?`,
    [id]
  );

  const values = {};
  for (const row of valueRows) {
    values[String(row.field_id)] = row.field_value;
  }

  return {
    id: machineRows[0].id,
    created_at: machineRows[0].created_at,
    updated_at: machineRows[0].updated_at,
    values
  };
}

app.get("/api/machines", async (req, res) => {
  try {
    const fields = await getFields();

    const [machineRows] = await pool.query(
      "SELECT id, created_at, updated_at FROM machines ORDER BY id DESC"
    );

    if (!machineRows.length) return res.json([]);

    const ids = machineRows.map((m) => m.id);
    const placeholders = ids.map(() => "?").join(",");

    const [valueRows] = await pool.query(
      `SELECT machine_id, field_id, field_value
       FROM machine_values
       WHERE machine_id IN (${placeholders})`,
      ids
    );

    const valueMap = {};
    for (const row of valueRows) {
      if (!valueMap[row.machine_id]) valueMap[row.machine_id] = {};
      valueMap[row.machine_id][String(row.field_id)] = row.field_value;
    }

    const machines = machineRows.map((machine) => ({
      ...machine,
      values: valueMap[machine.id] || {}
    }));

    res.json({ fields, machines });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/machines/:id", async (req, res) => {
  try {
    const machine = await getMachineById(Number(req.params.id));

    if (!machine) {
      return res.status(404).json({ message: "Machine not found." });
    }

    res.json(machine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function validateMachineValues(values) {
  const fields = await getFields();

  for (const field of fields) {
    const raw = values?.[String(field.id)];

    if (field.required && (raw === undefined || raw === null || String(raw).trim() === "")) {
      return `${field.field_name} is required.`;
    }

    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      if (field.field_type === "number" && Number.isNaN(Number(raw))) {
        return `${field.field_name} must be a number.`;
      }

      if (field.field_type === "dropdown" && !field.options.includes(String(raw))) {
        return `${field.field_name} has an invalid dropdown value.`;
      }
    }
  }

  return null;
}

async function saveMachineValues(machineId, values) {
  const fields = await getFields();

  for (const field of fields) {
    const raw = values?.[String(field.id)];
    const value =
      raw === undefined || raw === null || String(raw).trim() === ""
        ? null
        : String(raw);

    await pool.query(
      `INSERT INTO machine_values (machine_id, field_id, field_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE field_value = VALUES(field_value)`,
      [machineId, field.id, value]
    );
  }
}

app.post("/api/machines", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const values = req.body.values || {};
    const validationError = await validateMachineValues(values);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await connection.beginTransaction();

    const [result] = await connection.query("INSERT INTO machines () VALUES ()");
    const machineId = result.insertId;

    const fields = await getFields();

    for (const field of fields) {
      const raw = values[String(field.id)];
      const value =
        raw === undefined || raw === null || String(raw).trim() === ""
          ? null
          : String(raw);

      await connection.query(
        `INSERT INTO machine_values (machine_id, field_id, field_value)
         VALUES (?, ?, ?)`,
        [machineId, field.id, value]
      );
    }

    await connection.commit();

    res.status(201).json(await getMachineById(machineId));
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

app.put("/api/machines/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const machineId = Number(req.params.id);
    const values = req.body.values || {};
    const validationError = await validateMachineValues(values);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [machineRows] = await connection.query(
      "SELECT id FROM machines WHERE id = ?",
      [machineId]
    );

    if (!machineRows.length) {
      return res.status(404).json({ message: "Machine not found." });
    }

    await connection.beginTransaction();

    const fields = await getFields();

    for (const field of fields) {
      const raw = values[String(field.id)];
      const value =
        raw === undefined || raw === null || String(raw).trim() === ""
          ? null
          : String(raw);

      await connection.query(
        `INSERT INTO machine_values (machine_id, field_id, field_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE field_value = VALUES(field_value)`,
        [machineId, field.id, value]
      );
    }

    await connection.commit();

    res.json(await getMachineById(machineId));
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

app.delete("/api/machines/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM machines WHERE id = ?",
      [Number(req.params.id)]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Machine not found." });
    }

    res.json({ message: "Machine deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Prediction ----------------

app.post("/api/machines/:id/predict", async (req, res) => {
  try {
    const machine = await getMachineById(Number(req.params.id));

    if (!machine) {
      return res.status(404).json({ message: "Machine not found." });
    }

    const fields = await getFields();

    const byName = Object.fromEntries(
      fields.map((field) => [
        field.field_name.trim().toLowerCase(),
        machine.values[String(field.id)]
      ])
    );

  const temperature = Number(byName["temperature"]);
  const pressure = Number(byName["pressure"]);
  const vibration = byName["vibration"];
  const humidity = Number(byName["humidity"]);

  if (
  Number.isNaN(temperature) ||
  Number.isNaN(pressure) ||
  !vibration ||
  Number.isNaN(humidity)
) {
  return res.status(400).json({
    message:
      "Temperature, Pressure, Vibration and Humidity are required for the current ML model."
  });
}

   const response = await axios.post(
  `${ML_SERVICE_URL}/predict`,
  {
    temperature,
    pressure,
    vibration,
    humidity
  },
  { timeout: 10000 }
);
    res.json({
      machine_id: machine.id,
      risk_level: response.data.risk_level,
      model_features: {
        temperature,
        pressure,
        vibration,
        humidity
      },
      note: "The Random Forest model uses Temperature, Pressure and Vibration. Humidity and other dynamically added fields are stored but are not currently used by the model."
    });
  } catch (error) {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message;

    res.status(502).json({
      message: `Prediction service error: ${message}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
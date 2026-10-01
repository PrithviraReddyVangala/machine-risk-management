import React,{ useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  Plus,
  Settings2,
  Trash2,
  Pencil,
  BrainCircuit,
  RefreshCw
} from "lucide-react";

import {
  createField,
  createMachine,
  deleteField,
  deleteMachine,
  getFields,
  getMachines,
  predictMachine,
  updateField,
  updateMachine
} from "./api";

function App() {
  const [page, setPage] = useState("dashboard");
  const [fields, setFields] = useState([]);
  const [machines, setMachines] = useState([]);
  const [editingMachine, setEditingMachine] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [fieldData, machineData] = await Promise.all([
        getFields(),
        getMachines()
      ]);
      setFields(fieldData);
      setMachines(machineData.machines || []);
    } catch (error) {
      setNotice(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

async function handleFieldSave(payload) {
  try {
    if (editingField && !editingField.new) {
      await updateField(editingField.id, payload);
      showNotice("Field updated.");
    } else {
      await createField(payload);
      showNotice("Field added.");
    }

    setEditingField(null);
    await loadData();
  } catch (error) {
    showNotice(error.response?.data?.message || error.message);
  }
}
  async function handleFieldDelete(id) {
  console.log("Deleting field ID:", id);

  if (!window.confirm("Delete this field?")) return;
    try {
      await deleteField(id);
      showNotice("Field deleted.");
      await loadData();
    } catch (error) {
      showNotice(error.response?.data?.message || error.message);
    }
  }

async function handleMachineSave(values) {
    try {
        if (editingMachine && !editingMachine.new) {
            await updateMachine(editingMachine.id, values);
            showNotice("Machine updated.");
        } else {
            await createMachine(values);
            showNotice("Machine created.");
        }

        setEditingMachine(null);
        await loadData();
    } catch (error) {
        showNotice(error.response?.data?.message || error.message);
    }
}
  async function handleMachineDelete(id) {
    if (!window.confirm("Delete this machine?")) return;

    try {
      await deleteMachine(id);
      showNotice("Machine deleted.");
      await loadData();
    } catch (error) {
      showNotice(error.response?.data?.message || error.message);
    }
  }

  async function handlePredict() {
    if (!selectedMachine) {
      showNotice("Select a machine first.");
      return;
    }

    try {
      const result = await predictMachine(selectedMachine);
      setPrediction(result);
    } catch (error) {
      showNotice(error.response?.data?.message || error.message);
    }
  }

  const selectedMachineData = useMemo(
    () => machines.find((machine) => String(machine.id) === String(selectedMachine)),
    [machines, selectedMachine]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Cpu size={21} /></div>
          <div>
            <div className="brand-title">Machine Risk Manager</div>
            <div className="brand-subtitle">Dynamic machine data & local ML</div>
          </div>
        </div>

        <button className="refresh-button" onClick={loadData} title="Refresh">
          <RefreshCw size={17} />
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <button className={page === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setPage("dashboard")}>
            <Gauge size={18} /> Dashboard
          </button>
          <button className={page === "fields" ? "nav-item active" : "nav-item"} onClick={() => setPage("fields")}>
            <Settings2 size={18} /> Field Configuration
          </button>
          <button className={page === "machines" ? "nav-item active" : "nav-item"} onClick={() => setPage("machines")}>
            <Database size={18} /> Machine Records
          </button>
          <button className={page === "prediction" ? "nav-item active" : "nav-item"} onClick={() => setPage("prediction")}>
            <BrainCircuit size={18} /> Risk Prediction
          </button>
        </aside>

        <main className="main-content">
          {notice && <div className="notice">{notice}</div>}

          {loading ? (
            <div className="loading">Loading application data...</div>
          ) : (
            <>
              {page === "dashboard" && (
                <Dashboard
                  fields={fields}
                  machines={machines}
                  setPage={setPage}
                />
              )}

              {page === "fields" && (
                <FieldsPage
                  fields={fields}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  onSave={handleFieldSave}
                  onDelete={handleFieldDelete}
                />
              )}

              {page === "machines" && (
                <MachinesPage
                  fields={fields}
                  machines={machines}
                  editingMachine={editingMachine}
                  setEditingMachine={setEditingMachine}
                  onSave={handleMachineSave}
                  onDelete={handleMachineDelete}
                />
              )}

              {page === "prediction" && (
                <PredictionPage
                  fields={fields}
                  machines={machines}
                  selectedMachine={selectedMachine}
                  setSelectedMachine={setSelectedMachine}
                  selectedMachineData={selectedMachineData}
                  prediction={prediction}
                  onPredict={handlePredict}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ fields, machines, setPage }) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Manage dynamic machine fields and run local risk predictions."
      />

      <div className="stat-grid">
        <StatCard icon={<Cpu />} label="Machines" value={machines.length} />
        <StatCard icon={<Settings2 />} label="Configured Fields" value={fields.length} />
        <StatCard icon={<Activity />} label="ML Features" value="3" />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Current configuration</h2>
              <p>Fields are stored in the database and rendered dynamically.</p>
            </div>
            <button className="secondary-button" onClick={() => setPage("fields")}>
              Configure
            </button>
          </div>

          <div className="field-chip-list">
            {fields.map((field) => (
              <div className="field-chip" key={field.id}>
                <strong>{field.field_name}</strong>
                <span>{field.field_type}</span>
                {field.required && <small>Required</small>}
              </div>
            ))}
          </div>
        </section>

        <section className="panel highlight-panel">
          <BrainCircuit size={32} />
          <h2>Local ML prediction</h2>
          <p>
            The current Random Forest model uses Temperature, Pressure and
            Vibration. Dynamically added fields can be stored without retraining.
          </p>
          <button className="primary-button" onClick={() => setPage("prediction")}>
            Run Prediction
          </button>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function FieldsPage({ fields, editingField, setEditingField, onSave, onDelete }) {
  return (
    <>
      <PageHeader
        title="Field Configuration"
        subtitle="Add or modify machine fields without changing the database schema."
        action={
          <button className="primary-button" onClick={() => setEditingField({ new: true })}>
            <Plus size={17} /> Add Field
          </button>
        }
      />

      {editingField && (
        <FieldForm
          initial={editingField.new ? null : editingField}
          onSave={onSave}
          onCancel={() => setEditingField(null)}
        />
      )}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Dropdown Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td><strong>{field.field_name}</strong></td>
                  <td><span className="type-pill">{field.field_type}</span></td>
                  <td>{field.required ? "Yes" : "No"}</td>
                  <td>{field.options?.length ? field.options.join(", ") : "—"}</td>
                  <td>
                    <div className="actions">
                      <button className="icon-button" onClick={() => setEditingField(field)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" onClick={() => onDelete(field.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FieldForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.field_name || "");
  const [type, setType] = useState(initial?.field_type || "text");
  const [required, setRequired] = useState(Boolean(initial?.required));
  const [options, setOptions] = useState(initial?.options?.join("\n") || "");

  function submit(event) {
    event.preventDefault();

    const optionList = options
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    onSave({
      field_name: name,
      field_type: type,
      required,
      options: type === "dropdown" ? optionList : []
    });
  }

  return (
    <section className="panel form-panel">
      <div className="panel-heading">
        <div>
          <h2>{initial ? "Edit field" : "Add machine field"}</h2>
          <p>Field configuration is persisted in MySQL.</p>
        </div>
      </div>

      <form onSubmit={submit} className="form-grid">
        <label>
          Field Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Field Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="dropdown">Dropdown</option>
          </select>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required field
        </label>

        {type === "dropdown" && (
          <label className="full-width">
            Dropdown Options
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={"Low\nMedium\nHigh"}
              required
            />
            <small>Enter one option per line.</small>
          </label>
        )}

        <div className="form-actions full-width">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-button">Save Field</button>
        </div>
      </form>
    </section>
  );
}

function MachinesPage({
  fields,
  machines,
  editingMachine,
  setEditingMachine,
  onSave,
  onDelete
}) {
  return (
    <>
      <PageHeader
        title="Machine Records"
        subtitle="Create, edit and delete records using the current dynamic field configuration."
        action={
          <button
            className="primary-button"
            onClick={() => setEditingMachine({ new: true, values: {} })}
          >
            <Plus size={17} /> Add Machine
          </button>
        }
      />

      {editingMachine && (
        <MachineForm
          fields={fields}
          initial={editingMachine.new ? null : editingMachine}
          onSave={onSave}
          onCancel={() => setEditingMachine(null)}
        />
      )}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {fields.map((field) => <th key={field.id}>{field.field_name}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 1} className="empty-cell">
                    No machines yet. Add your first machine.
                  </td>
                </tr>
              ) : (
                machines.map((machine) => (
                  <tr key={machine.id}>
                    {fields.map((field) => (
                      <td key={field.id}>
                        {machine.values[String(field.id)] || "—"}
                      </td>
                    ))}
                    <td>
                      <div className="actions">
                        <button className="icon-button" onClick={() => setEditingMachine(machine)}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button danger" onClick={() => onDelete(machine.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function MachineForm({ fields, initial, onSave, onCancel }) {
  const [values, setValues] = useState(initial?.values || {});

  function change(fieldId, value) {
    setValues((current) => ({
      ...current,
      [String(fieldId)]: value
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(values);
  }

  return (
    <section className="panel form-panel">
      <div className="panel-heading">
        <div>
          <h2>{initial ? "Edit machine" : "Create machine"}</h2>
          <p>This form is generated from the configured fields.</p>
        </div>
      </div>

      <form onSubmit={submit} className="form-grid">
        {fields.map((field) => (
          <label key={field.id}>
            {field.field_name} {field.required && <span className="required">*</span>}

            {field.field_type === "text" && (
              <input
                type="text"
                value={values[String(field.id)] || ""}
                onChange={(e) => change(field.id, e.target.value)}
                required={field.required}
              />
            )}

            {field.field_type === "number" && (
              <input
                type="number"
                step="any"
                value={values[String(field.id)] || ""}
                onChange={(e) => change(field.id, e.target.value)}
                required={field.required}
              />
            )}

            {field.field_type === "dropdown" && (
              <select
                value={values[String(field.id)] || ""}
                onChange={(e) => change(field.id, e.target.value)}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
          </label>
        ))}

        <div className="form-actions full-width">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-button">Save Machine</button>
        </div>
      </form>
    </section>
  );
}

function PredictionPage({
  fields,
  machines,
  selectedMachine,
  setSelectedMachine,
  selectedMachineData,
  prediction,
  onPredict
}) {
  return (
    <>
      <PageHeader
        title="Risk Prediction"
        subtitle="Run the local Python Random Forest model against a selected machine."
      />

      <div className="prediction-layout">
        <section className="panel">
          <label>
            Select Machine
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              <option value="">Choose a machine...</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  Machine #{machine.id}
                  {machine.values?.[String(fields.find(f => f.field_name.toLowerCase() === "machine name")?.id)] ?
                    ` — ${machine.values[String(fields.find(f => f.field_name.toLowerCase() === "machine name")?.id)]}` : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedMachineData && (
            <div className="machine-preview">
              <h3>Machine data</h3>
              {fields.map((field) => (
                <div className="preview-row" key={field.id}>
                  <span>{field.field_name}</span>
                  <strong>{selectedMachineData.values[String(field.id)] || "—"}</strong>
                </div>
              ))}
            </div>
          )}

          <button
            className="primary-button wide-button"
            onClick={onPredict}
            disabled={!selectedMachine}
          >
            <BrainCircuit size={17} /> Predict Risk
          </button>
        </section>

        <section className="panel result-panel">
          {!prediction ? (
            <>
              <div className="result-icon"><Activity size={36} /></div>
              <h2>No prediction yet</h2>
              <p>Select a machine and run the local ML model.</p>
            </>
          ) : (
            <>
              <div className={`risk-badge ${prediction.risk_level.toLowerCase()}`}>
                {prediction.risk_level} RISK
              </div>
              <h2>Risk Level: {prediction.risk_level}</h2>
              <p>
                Prediction generated by the local Python/scikit-learn service.
              </p>
              <div className="model-note">
                Current features: Temperature, Pressure, Vibration.
                <br />
                Humidity is stored but is not currently used by the model.
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default App;

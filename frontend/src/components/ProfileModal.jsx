import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Check, Shield, User, X } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALL_SKILLS = [
  'First Aid',
  'CPR',
  'Emergency Driving',
  'Medical / Triage',
  'Oxygen Delivery',
  'Blood Donation',
];

export default function ProfileModal({ isOpen, onClose }) {
  const { user, token } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    setIsLoading(true);
    axios.get(`${API_URL}/helper/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const h = res.data?.helper || {};
        setName(h.name || user?.name || '');
        setPhone(h.phone || user?.phone || '');
        setBloodGroup(h.blood_group || '');
        const rawSkills = h.skills;
        if (Array.isArray(rawSkills)) {
          setSkills(rawSkills);
        } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
          setSkills(rawSkills.split(',').map(s => s.trim()));
        } else {
          setSkills([]);
        }
      })
      .catch(() => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, token, user]);

  if (!isOpen) return null;

  function toggleSkill(skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      await axios.put(
        `${API_URL}/helper/profile`,
        {
          name: name.trim(),
          phone: phone.trim(),
          blood_group: bloodGroup || null,
          skills: skills,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Responder profile & qualifications updated.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(13, 12, 10, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E2DA',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        fontFamily: "'Sora', sans-serif",
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #E4E2DA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#FEF3F1',
              border: '1px solid #F5C4BE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={16} style={{ color: '#D93B2B' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0D0C0A' }}>
                Responder Profile & Qualifications
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#8A8878' }}>
                Manage your contact details and active response capabilities
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#8A8878',
            padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', border: '3px solid #E4E2DA',
              borderTopColor: '#D93B2B', animation: 'spin 0.7s linear infinite', display: 'inline-block',
            }} />
            <p style={{ fontSize: '0.8125rem', color: '#8A8878', marginTop: '0.75rem' }}>Loading credentials…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Operator Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.35rem' }}>
                Operator / Responder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="input-field"
                placeholder="e.g. Dr. Alex Mercer"
                style={{ fontSize: '0.875rem' }}
              />
            </div>

            {/* Direct Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.35rem' }}>
                Direct Contact Phone (for Emergency Calls)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field"
                placeholder="e.g. +8801712345678"
                style={{ fontSize: '0.875rem' }}
              />
              <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: '0.25rem' }}>
                Used by emergency dispatchers to initiate instant direct calls.
              </p>
            </div>

            {/* Blood Group */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.35rem' }}>
                Blood Group (Transfusion Ready)
              </label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="">Not Specified</option>
                {BLOOD_GROUPS.map(bg => (
                  <option key={bg} value={bg}>🩸 {bg}</option>
                ))}
              </select>
            </div>

            {/* Skills & Certifications */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.5rem' }}>
                Specialist Qualifications & Skills
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {ALL_SKILLS.map(skill => {
                  const active = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.8125rem',
                        fontWeight: 600, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
                        border: active ? '1px solid #A8DCBC' : '1px solid #E4E2DA',
                        background: active ? '#EDF8F2' : '#F7F6F1',
                        color: active ? '#15663E' : '#5A5850',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span>{skill}</span>
                      {active && <Check size={14} style={{ color: '#15663E' }} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', paddingTop: '0.5rem', borderTop: '1px solid #E4E2DA', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 700 }}
              >
                {isSaving ? 'Saving…' : 'Save Qualifications'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

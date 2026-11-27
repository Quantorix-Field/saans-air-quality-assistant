import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileForm } from '../src/features/onboarding/ProfileForm.js';
import { ProfileInputSchema } from '../shared/schemas.js';
import { I18nProvider } from '../src/i18n/index.js';

function renderForm(onSubmit = vi.fn(), initial?: Parameters<typeof ProfileForm>[0]['initial']) {
  return render(
    <MemoryRouter>
      <I18nProvider language="en">
        <ProfileForm onSubmit={onSubmit} initial={initial} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('ProfileForm', () => {
  it('renders with adult default selected', () => {
    renderForm();
    const adult = screen.getByRole('radio', { name: /adult/i });
    expect((adult as HTMLInputElement).checked).toBe(true);
  });

  it('renders with metro commute default', () => {
    renderForm();
    const sel = screen.getByRole('combobox', { name: /main commute/i }) as HTMLSelectElement;
    expect(sel.value).toBe('metro');
  });

  it('renders outdoor hours defaults 05:00 / 21:00', () => {
    renderForm();
    const start = screen.getByRole('combobox', { name: /start time/i }) as HTMLSelectElement;
    const end = screen.getByRole('combobox', { name: /end time/i }) as HTMLSelectElement;
    expect(start.value).toBe('5');
    expect(end.value).toBe('21');
  });

  it('shows time error when start >= end on submit', () => {
    renderForm();
    const start = screen.getByRole('combobox', { name: /start time/i });
    const end = screen.getByRole('combobox', { name: /end time/i });
    fireEvent.change(start, { target: { value: '20' } });
    fireEvent.change(end, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText(/start time must be before/i)).toBeDefined();
  });

  it('marks start select aria-invalid on time error', () => {
    renderForm();
    const start = screen.getByRole('combobox', { name: /start time/i });
    fireEvent.change(start, { target: { value: '21' } });
    fireEvent.change(screen.getByRole('combobox', { name: /end time/i }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(start.getAttribute('aria-invalid')).toBe('true');
  });

  it('calls onSubmit with valid shape matching ProfileInputSchema', () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    const call = onSubmit.mock.calls[0];
    const arg: unknown = call?.[0];
    expect(ProfileInputSchema.safeParse(arg).success).toBe(true);
  });

  it('prefills with initial values', () => {
    renderForm(vi.fn(), {
      ageGroup: 'senior',
      conditions: ['heart'],
      commuteMode: 'walk',
      hasPurifier: true,
      hasN95: false,
      outdoorHours: { start: 7, end: 18 },
    });
    expect((screen.getByRole('radio', { name: /senior/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('combobox', { name: /main commute/i }) as HTMLSelectElement).value).toBe('walk');
  });

  it('shows device note and medical note', () => {
    renderForm();
    expect(screen.getByText(/stays on your device/i)).toBeDefined();
    expect(screen.getByText(/not medical advice/i)).toBeDefined();
  });

  it('toggling a condition includes it in submitted profile', () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);
    fireEvent.click(screen.getByRole('checkbox', { name: /asthma/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const call = onSubmit.mock.calls[0];
    const arg = call?.[0] as { conditions: string[] } | undefined;
    if (!arg) throw new Error('onSubmit not called');

    expect(arg.conditions).toContain('asthmaCopd');
  });

  it('error message linked via aria-describedby and moves focus to first invalid control', () => {
    renderForm();
    const start = screen.getByRole('combobox', { name: /start time/i });
    fireEvent.change(start, { target: { value: '21' } });
    fireEvent.change(screen.getByRole('combobox', { name: /end time/i }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const describedBy = start.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy ?? '');
    expect(errorEl?.textContent).toMatch(/start time/i);
    expect(document.activeElement).toBe(start);
  });

  it('supports keyboard operation to change fields and submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm(onSubmit);
    await user.tab(); // radio group (adult is checked)
    await user.keyboard('{ArrowUp}'); // moves to child
    await user.selectOptions(screen.getByRole('combobox', { name: /main commute/i }), 'bus');
    await user.click(screen.getByRole('checkbox', { name: /air purifier/i }));
    const submitBtn = screen.getByRole('button', { name: /save/i });
    submitBtn.focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    const arg = onSubmit.mock.calls[0]?.[0] as { ageGroup: string; commuteMode: string; hasPurifier: boolean };
    expect(arg.ageGroup).toBe('child');
    expect(arg.commuteMode).toBe('bus');
    expect(arg.hasPurifier).toBe(true);
  });
});

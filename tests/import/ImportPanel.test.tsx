import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ImportPanel } from '../../src/renderer/import/ImportPanel';
const html = readFileSync('tests/fixtures/student-v2.html', 'utf8');
it('previews a valid paste before confirming it', async () => {
  const confirm = vi.fn(); render(<ImportPanel onConfirm={confirm}/>);
  await userEvent.click(screen.getByRole('button',{name:'Preview import'})); expect(confirm).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button',{name:'Paste HTML'}));
  await userEvent.click(screen.getByLabelText('UTAR course HTML'));
  await userEvent.paste(html);
  await userEvent.click(screen.getByRole('button',{name:'Preview import'}));
  expect(screen.getByText('2 courses')).toBeInTheDocument(); expect(confirm).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button',{name:'Use these courses'})); expect(confirm).toHaveBeenCalledOnce();
});
it('cancels a preview without replacing the current project', async () => {
  const confirm = vi.fn(); render(<ImportPanel onConfirm={confirm}/>);
  await userEvent.click(screen.getByRole('button',{name:'Paste HTML'}));await userEvent.click(screen.getByLabelText('UTAR course HTML'));await userEvent.paste(html);await userEvent.click(screen.getByRole('button',{name:'Preview import'}));
  await userEvent.click(screen.getByRole('button',{name:'Cancel import'})); expect(confirm).not.toHaveBeenCalled();
});

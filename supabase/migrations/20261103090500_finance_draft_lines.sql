-- Accounting staff build an invoice line by line, so they need to take a line
-- back out while the invoice is still a draft. Once an invoice is issued its
-- lines stay put (only an admin can delete them, or the invoice is cancelled),
-- which keeps issued totals from changing quietly.
create policy invoice_lines_delete_draft on public.invoice_lines
  for delete to authenticated
  using (
    public.can_manage_finance()
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_lines.invoice_id and i.status = 'draft'
    )
  );

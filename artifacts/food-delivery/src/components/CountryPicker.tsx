import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { COUNTRIES, type Country } from "@/lib/countries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";

interface Props {
  open: boolean;
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}

export function CountryPicker({ open, selected, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 max-h-[80vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{t("login.selectCountry")}</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground start-3" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("login.searchCountry")}
              className="ps-9 h-10"
              aria-label={t("login.searchCountry")}
            />
          </div>
        </div>
        <ul role="listbox" aria-label={t("login.selectCountry")} className="overflow-y-auto px-2 pb-3">
          {filtered.map((c) => {
            const isSelected = c.code === selected.code;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors text-start ${
                    isSelected ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {isSelected && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                    {c.name}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {c.dialCode}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("login.noCountryFound")}
            </p>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

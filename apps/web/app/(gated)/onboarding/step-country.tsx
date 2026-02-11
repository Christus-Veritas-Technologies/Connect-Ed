"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Globe01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOnboarding } from "./onboarding-context";
import { FormActions } from "./components";

const COUNTRIES = [
    { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", currency: "USD" },
    { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR" },
] as const;

interface StepCountryProps {
    onNext: () => void;
    onSkip?: () => void;
}

export function StepCountry({ onNext, onSkip }: StepCountryProps) {
    const { data, updateCountry } = useOnboarding();
    const [selected, setSelected] = useState<string>(data.country || "");

    const handleContinue = () => {
        if (selected) {
            const match = COUNTRIES.find((c) => c.code === selected);
            updateCountry(selected, match?.currency || "USD");
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-600"
            >
                Select the country where your school is located. This determines your
                default currency and payment options.
            </motion.p>

            <div className="grid gap-4 sm:grid-cols-2">
                {COUNTRIES.map((country, index) => {
                    const isActive = selected === country.code;

                    return (
                        <motion.button
                            key={country.code}
                            type="button"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setSelected(country.code)}
                            className={`
                flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all
                ${isActive
                                    ? "border-brand bg-brand/5 ring-4 ring-brand/20"
                                    : "border-border bg-background hover:border-brand/40"
                                }
              `}
                        >
                            <span className="text-4xl">{country.flag}</span>
                            <div>
                                <p className="font-semibold text-foreground">{country.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Default currency: {country.currency}
                                </p>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <FormActions
                canContinue={!!selected}
                showBack={false}
                delay={0.25}
                onSkip={onSkip}
                showSkip={!!onSkip}
            />
        </div>
    );
}

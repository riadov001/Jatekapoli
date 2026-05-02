import { useState } from "react";
import { Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface OrderRatingModalProps {
  open: boolean;
  orderId: number;
  driverName?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export function OrderRatingModal({ open, orderId, driverName, onClose, onSubmit }: OrderRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await onSubmit(rating, comment);
      setSubmitted(true);
      setTimeout(() => { onClose(); }, 1500);
    } catch {} finally {
      setLoading(false);
    }
  };

  const labels = ["", "Mauvais", "Passable", "Bien", "Très bien", "Excellent !"];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-background rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm mx-4 sm:mx-0 shadow-2xl z-10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            {submitted ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-bold text-lg">Merci pour votre avis !</h3>
                <p className="text-sm text-muted-foreground mt-1">Votre évaluation aide à améliorer le service.</p>
              </div>
            ) : (
              <>
                <h3 className="font-display font-bold text-xl mb-1 text-center">
                  Évaluer votre livreur
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {driverName ? `Comment s'est passée la livraison avec ${driverName} ?` : "Comment s'est passée votre livraison ?"}
                </p>

                {/* Star selector */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${(hovered || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm font-semibold text-primary h-5 mb-4">
                  {labels[hovered || rating]}
                </p>

                <Textarea
                  placeholder="Un commentaire ? (optionnel)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="resize-none mb-4"
                  maxLength={300}
                />

                <Button
                  className="w-full h-12 font-semibold rounded-xl"
                  onClick={handleSubmit}
                  disabled={rating === 0 || loading}
                >
                  {loading ? "Envoi..." : "Envoyer mon avis"}
                </Button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

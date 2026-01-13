**Approche et Établissement des critères**
Nous avons entraîné un modèle de régression ($f$) pour estimer la note potentielle d'un élève si ses leviers d'action (absentéisme, temps d'étude, consommation d'alcool) étaient optimisés. Pour un élève $i$, nous calculons sa **marge de progression** ($\Delta_i$) en comparant sa note réelle ($y_i$) à sa note potentielle prédite ($\hat{y}_i^{opt}$) :

$$ \hat{y}_i^{opt} = f(X_i^{optimisé}) $$
$$ \Delta_i = \max(0, \hat{y}_i^{opt} - y_i) $$

Le **Score de Complexité** ($C_i$) est dérivé de cette marge : un élève avec une forte marge de progression est considéré comme "facile" à aider (leviers identifiés), tandis qu'un élève en échec sans marge apparente présente une complexité maximale (proche de 1).

$$ C_i = 1 - \frac{\Delta_i}{20} $$

## How to Run


1. **Run the command:**
```bash
docker-compose up --build
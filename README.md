**Approche et Établissement des critères**

Nous avons entraîné un modèle de régression (Random Forest) pour prédire la note finale. Ensuite, pour chaque élève, nous simulons un "profil idéal" (temps d'étude maximisé, absentéisme nul, etc.) afin de prédire une note potentielle théorique. Pour évaluer alors la difficulté d'accompagnement, nous comparons la note actuelle de l'élève à sa note potentielle. Le score de complexité traduit cet écart : si l'élève a une grande marge de progression, sa complexité est faible car ses leviers d'amélioration sont évidents (ex: travailler plus). À l'inverse, si l'élève a une faible marge de progression, sa complexité est élevée (proche de 1) : cela signifie qu'il est déjà au maximum de ses capacités actuelles ou que ses difficultés ne dépendent pas simplement de ses habitudes de vie.

**Formules**

`Improvability_Score = max(0, Potential_Grade - Actual_Grade) / 20`

`Complexity_Score = 1 - Improvability_Score`

## How to Run


1. **Run the command:**
```bash
docker-compose up --build

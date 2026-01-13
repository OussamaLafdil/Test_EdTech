**Approche et Établissement des critères**
Nous avons entraîné un modèle de régression (Random Forest) pour capter la corrélation entre les habitudes de vie et la note finale. Pour chaque élève, nous simulons un "profil idéal" (temps d'étude maximisé, absentéisme nul, etc.) afin de prédire une note potentielle théorique. Le score de complexité est calculé inversement à cet écart : un élève ayant une grande marge de progression (écart élevé) est considéré comme "moins complexe" à aider car des leviers d'action clairs existent, tandis qu'un élève en échec malgré de bonnes habitudes présente une complexité élevée.

`Improvability_Score = max(0, Potential_Grade - Actual_Grade) / 20`

`Complexity_Score = 1 - Improvability_Score`

## How to Run


1. **Run the command:**
```bash
docker-compose up --build

# Revision DEA

Petite application locale pour reviser le DEA a partir des fiches du dossier `APPLI`.

## Ouvrir l'application

Quand le serveur local est lance depuis le dossier `APPLI`, ouvrir :

http://127.0.0.1:4174/application-dea/index.html

## Ce que fait l'application

- Affiche les fiches individuelles en priorite.
- Reference uniquement les fiches de revision, sans les supports Bloc complets.
- Permet de chercher par mot-cle, theme ou statut.
- Garde la progression dans le navigateur : a revoir, en cours, acquise, favoris et notes.
- Propose un quiz oral sur les fiches visibles.

## Mise a jour des fiches

Si tu ajoutes ou renommes des PDF/Word dans le dossier `APPLI`, il faudra regenerer `data.js` pour mettre l'index a jour.

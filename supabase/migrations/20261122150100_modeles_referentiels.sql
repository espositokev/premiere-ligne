-- Étape 2a — Les deux modèles de référentiel fournis par Première Ligne (données).
-- « Vente automobile » reprend mot pour mot la matrice du kit de formation ;
-- « Vente — socle général » en est la version tous secteurs, à relire par le fondateur.
-- Identifiants fixes : la migration est rejouable sur une base vide, et les Dojos de la
-- bibliothèque (étape 2b) peuvent s'y rattacher.

insert into public.framework_templates (id, name, description, published) values ('cfa8503e-f2f4-5984-b081-14222bc15e0e', 'Vente automobile', 'Matrice Première Ligne pour la vente automobile : tunnel de vente en concession et compétences transversales.', true);
insert into public.template_blocks (id, template_id, name, position) values ('f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'cfa8503e-f2f4-5984-b081-14222bc15e0e', 'Bloc 1 — Tunnel de vente', 0);
insert into public.template_competencies (id, block_id, name, statement, position) values ('da8538d0-72fb-5179-a7e4-5d24982fa245', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Accueil', 'Je sais créer un accueil personnalisé avec mon client', 0);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('c5b6577c-2748-563d-888e-9806ffca0bd5', 'da8538d0-72fb-5179-a7e4-5d24982fa245', 'Accueil en moins de 20s', 'J''accueille mon client en moins de 20 secondes', 0),
  ('9e91a232-5d7f-55ce-a738-9d43477a0221', 'da8538d0-72fb-5179-a7e4-5d24982fa245', 'Expérience unique', 'Je souris avec une attitude positive et engageante pour créer une expérience unique', 1),
  ('d7af16ae-d88e-5f55-9464-d7635abcd6b8', 'da8538d0-72fb-5179-a7e4-5d24982fa245', 'Utilisation de la boisson', 'J''accompagne mon client à prendre une boisson', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('f30ebdef-923d-5f21-9154-18ad83b0ff26', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Découverte', 'Je sais faire une découverte complète des besoins de mon client', 1);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('9dcb87d0-6629-51d6-b854-b903a05a5c86', 'f30ebdef-923d-5f21-9154-18ad83b0ff26', 'Découverte des habitudes', 'Je sais obtenir assez d''informations sur les habitudes d''usage et les motivations d''achat', 0),
  ('ac5b2c3f-71fa-589e-a8cc-c2e22f41240d', 'f30ebdef-923d-5f21-9154-18ad83b0ff26', 'Découverte du besoin', 'Je suis capable de découvrir les caractéristiques du véhicule recherché par mon client', 1),
  ('a114d7e7-031a-5b42-8c3b-92f0a6efd451', 'f30ebdef-923d-5f21-9154-18ad83b0ff26', 'Découverte du financement', 'Je suis capable de trouver le financement et PC adaptés en fonction des habitudes d''usage', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('4ec96dc0-f299-5441-abed-d2b0fc25b2ea', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Lien client', 'Je sais créer un lien unique avec mon client', 2);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('912d1952-44cf-5635-896f-2f8905411bdc', '4ec96dc0-f299-5441-abed-d2b0fc25b2ea', 'Échange relationnel', 'Je sais éviter l''effet « interrogatoire » lorsque je cherche à obtenir des informations', 0),
  ('d9785f3a-4457-54cc-be33-f69534a54656', '4ec96dc0-f299-5441-abed-d2b0fc25b2ea', 'Présentation', 'Je suis capable de rassurer mon client en adaptant ma prise en charge', 1),
  ('3bab76d1-de9e-5f5e-bd84-73008ac714b6', '4ec96dc0-f299-5441-abed-d2b0fc25b2ea', 'Expériences communes', 'Je sais obtenir des informations sur la vie de mon client pour trouver des expériences communes', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('520e948a-c953-5846-8b7f-1c6897ecfd3f', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Argumentation', 'Je sais faire une sélection & argumentation véhicule adaptée', 3);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('1192fc41-b066-57bb-8539-af2a45d8eb24', '520e948a-c953-5846-8b7f-1c6897ecfd3f', 'Véhicule adapté', 'Je sais trouver le véhicule adapté selon les besoins en reformulant les points clés de la découverte', 0),
  ('3485f79f-9e33-59aa-af7c-73ad467dda9a', '520e948a-c953-5846-8b7f-1c6897ecfd3f', 'Méthode CAB Vh', 'Je sais tourner les caractéristiques du véhicule en avantages et bénéfices — méthode CAB', 1),
  ('2b19061e-06d5-5e93-bc67-accb9dbcdd34', '520e948a-c953-5846-8b7f-1c6897ecfd3f', 'Essai véhicule', 'Je suis capable de conduire et exploiter un essai comme levier de vente', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('f29867bb-92ef-5a81-ae39-70c5fd5a0659', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Objections', 'Je sais traiter les objections de mon client', 4);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('6b9e6296-431d-58f1-9be5-ceb956794e11', 'f29867bb-92ef-5a81-ae39-70c5fd5a0659', 'Comprendre l''objection', 'Je sais me montrer empathique en accusant réception de l''objection sans effet « combat de boxe »', 0),
  ('57672187-a47c-5d0e-8325-aa677c0f03c4', 'f29867bb-92ef-5a81-ae39-70c5fd5a0659', 'Déceler l''objection', 'Je suis capable de déterminer s''il s''agit d''une objection fondée en posant une question ouverte', 1),
  ('870ca27d-6132-5fe0-98ba-927d9cc95416', 'f29867bb-92ef-5a81-ae39-70c5fd5a0659', 'Théorie argumentative', 'Je suis capable d''argumenter et de rassurer sur les doutes réels de mon client', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Financement', 'Je sais proposer financement & assurances naturellement', 5);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('bc046cae-2099-5d4e-b1b5-8092c49c2de3', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Méthode CAB Fi', 'Je sais tourner les caractéristiques du financement en avantages et bénéfices — méthode CAB Fi', 0),
  ('5e416cd2-ba71-5b9b-98a3-0677bd11cc05', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Teasing financement', 'Je sais faire un teasing du financement avant de faire une proposition complète', 1),
  ('c99ab823-c3d0-57c7-beea-134855e30704', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Recherche par mensualité', 'Je sais rechercher un véhicule en fonction de la mensualité de mon client', 2),
  ('91501195-b82a-5f95-b077-809cdc12df8c', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Closing financement', 'Je sais engager mon client dans ma proposition de financement jusqu''à l''accord de principe', 3),
  ('ded5b622-e7e6-551c-a5e5-d80230261159', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Produits assurance', 'Je sais proposer les produits assurance & complémentaires en les liant aux besoins découverts', 4),
  ('256eadd1-eeae-59d6-aafe-f906055eb837', 'ceeb0e8f-cfea-5834-bb0c-94fad53f3ccd', 'Objections Fi & assurances', 'Je sais répondre aux objections liées au financement et aux assurances', 5);
insert into public.template_competencies (id, block_id, name, statement, position) values ('e9849395-d422-5b4b-9ffd-771e7b5ffe2e', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Next steps', 'Je sais qualifier la RNV et personnaliser ma relance', 6);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('aef3646b-cdfe-5d87-991d-1cc7b698a324', 'e9849395-d422-5b4b-9ffd-771e7b5ffe2e', 'Raison de non-vente', 'Je sais communiquer systématiquement la raison de non-vente avec précision', 0),
  ('64cf1e1e-b3a0-503a-bd0d-637fd20e5cef', 'e9849395-d422-5b4b-9ffd-771e7b5ffe2e', 'Personnaliser la relance', 'Je suis capable de personnaliser le niveau et le contenu de la relance selon la RNV', 1);
insert into public.template_competencies (id, block_id, name, statement, position) values ('0c8206a0-bacc-5226-8970-433966344607', 'f08c3309-a0aa-5d74-a01b-7f20fb38fe39', 'Livraison', 'Je sais soigner la livraison et planter les graines de la fidélisation', 7);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('089a70ed-112f-5a77-8323-e2b0aec2fe39', '0c8206a0-bacc-5226-8970-433966344607', 'Remise de clés', 'Je suis capable de préparer et personnaliser la remise de clés comme un moment mémorable', 0),
  ('2fdae8d0-a8ea-5230-928e-f24f57e09508', '0c8206a0-bacc-5226-8970-433966344607', 'Suivi post-livraison', 'Je sais expliquer les étapes post-livraison et les services disponibles', 1),
  ('afdda43e-0a8a-560d-bbda-855b39f24613', '0c8206a0-bacc-5226-8970-433966344607', 'Demande recommandation', 'Je suis capable de demander naturellement une recommandation à mon client satisfait', 2);
insert into public.template_blocks (id, template_id, name, position) values ('f50de12a-fd01-5412-beb5-94fa9335b408', 'cfa8503e-f2f4-5984-b081-14222bc15e0e', 'Bloc 2 — Compétences transversales', 1);
insert into public.template_competencies (id, block_id, name, statement, position) values ('281a22b6-cb63-5b12-a6f6-3b40847121df', 'f50de12a-fd01-5412-beb5-94fa9335b408', 'Communication', 'Je sais adapter ma communication verbale, non verbale et paraverbale', 0);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('7921f1d2-245e-5733-85ab-a9373b4fc30e', '281a22b6-cb63-5b12-a6f6-3b40847121df', 'Interpréter les signaux', 'Je suis capable d''interpréter les signaux de communication de mon client', 0),
  ('b9578d3f-4304-5051-be0b-6589422957e6', '281a22b6-cb63-5b12-a6f6-3b40847121df', 'Adapter le comportement', 'Je sais adapter mon comportement verbal, non verbal et paraverbal pour favoriser l''échange', 1),
  ('f5dc5226-e0cd-5660-ae96-75027c2b1d54', '281a22b6-cb63-5b12-a6f6-3b40847121df', 'Le SONCASE', 'Je sais utiliser les leviers du SONCASE pour appuyer mon discours', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('31782579-da18-502f-bbcb-c909309de27d', 'f50de12a-fd01-5412-beb5-94fa9335b408', 'Organisation', 'Je sais m''organiser avec rigueur en lien avec mon activité commerciale', 1);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('6a66a9b3-757d-5fd2-add2-99a8f3afb32c', '31782579-da18-502f-bbcb-c909309de27d', 'Planifier mon activité', 'Je sais planifier et lisser mon activité pour assurer un suivi adapté de mes clients', 0),
  ('2067116b-a471-55fe-b965-10fc73f6355c', '31782579-da18-502f-bbcb-c909309de27d', 'Confirmer les RDV', 'Je sais confirmer 100 % de mes rdv en creusant le projet', 1),
  ('82c18e89-d4c6-57e3-8d83-6a39bbd6b5b2', '31782579-da18-502f-bbcb-c909309de27d', 'Volume d''apps PTF', 'Je sais maintenir le bon volume d''apps dans mon portefeuille', 2),
  ('6f11612e-43e0-5819-bdcc-67ffd05bb629', '31782579-da18-502f-bbcb-c909309de27d', 'Optimiser la boîte mail', 'Je sais optimiser la gestion de ma boîte mail sans oubli ni retard', 3);
insert into public.template_competencies (id, block_id, name, statement, position) values ('25cd935f-a417-51a6-a7b2-80a116c93fbf', 'f50de12a-fd01-5412-beb5-94fa9335b408', 'Connaissance produit', 'Je sais démontrer ma connaissance produit & gamme', 2);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('0ffdcfd2-23a8-5c71-9bda-8ddba1fc0f36', '25cd935f-a417-51a6-a7b2-80a116c93fbf', 'Connaissance gamme', 'Je connais les caractéristiques techniques des véhicules de ma gamme', 0),
  ('bef8cb22-e10a-52f4-88ef-41e0472d1e6b', '25cd935f-a417-51a6-a7b2-80a116c93fbf', 'Positionnement concurrence', 'Je suis capable de positionner notre offre face à la concurrence', 1),
  ('55779971-d1b4-51e6-965e-4705bb926f31', '25cd935f-a417-51a6-a7b2-80a116c93fbf', 'Offres financement', 'Je connais les offres de financement et les conditions en vigueur', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('5028e6c8-94e5-5a89-8c56-e38faab07c5f', 'f50de12a-fd01-5412-beb5-94fa9335b408', 'Posture', 'Je soigne ma posture et mon attitude commerciale au quotidien', 3);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('e920543c-6c20-5036-82e4-f2735d2642e1', '5028e6c8-94e5-5a89-8c56-e38faab07c5f', 'Auto-fixation d''objectifs', 'Je suis capable de me fixer des objectifs de progression personnels', 0),
  ('77cd90e3-6c06-51f5-b9ca-5c5e288678d7', '5028e6c8-94e5-5a89-8c56-e38faab07c5f', 'Résilience commerciale', 'Je sais gérer les refus et les périodes de creux sans décrocher', 1),
  ('7ad4ce0b-8a2b-525a-a48e-b06a094bf73c', '5028e6c8-94e5-5a89-8c56-e38faab07c5f', 'Relation manager', 'Je sais utiliser mon manager comme ressource de progression', 2),
  ('a22e93ca-bd06-526a-8376-4728080e09e8', '5028e6c8-94e5-5a89-8c56-e38faab07c5f', 'Posture proactive', 'J''adopte une posture proactive — je crée mes opportunités sans attendre', 3);

insert into public.framework_templates (id, name, description, published) values ('2a5765d1-18f3-52e9-8b6d-f4e299cfe242', 'Vente — socle général', 'Matrice Première Ligne tous secteurs, à adapter au métier de chaque client.', true);
insert into public.template_blocks (id, template_id, name, position) values ('68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', '2a5765d1-18f3-52e9-8b6d-f4e299cfe242', 'Bloc 1 — Tunnel de vente', 0);
insert into public.template_competencies (id, block_id, name, statement, position) values ('62725dad-adfa-5ef9-a95e-9cb0b07d5e97', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Accueil', 'Je sais créer un accueil personnalisé avec mon client', 0);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('e77b6621-ea0f-5b53-9e2a-50f03883733f', '62725dad-adfa-5ef9-a95e-9cb0b07d5e97', 'Prise en charge rapide', 'Je prends en charge mon client rapidement, sans le laisser attendre', 0),
  ('a27db590-2f6e-5a0d-9abb-eacf2507d43c', '62725dad-adfa-5ef9-a95e-9cb0b07d5e97', 'Expérience unique', 'J''adopte une attitude souriante et engageante pour créer une expérience unique', 1),
  ('54080b1e-4099-57e7-b686-ad9619d7d3ce', '62725dad-adfa-5ef9-a95e-9cb0b07d5e97', 'Mise à l''aise', 'Je mets mon client à l''aise dès les premières minutes', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('09fbdb2e-7f23-515d-88b7-f653c3b4dfc4', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Découverte', 'Je sais faire une découverte complète des besoins de mon client', 1);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('9c6ef4d5-1032-5608-8184-acc2a1af8d4c', '09fbdb2e-7f23-515d-88b7-f653c3b4dfc4', 'Habitudes et motivations', 'Je sais obtenir des informations sur les habitudes et les motivations d''achat de mon client', 0),
  ('ab4a5806-53c3-59c3-a94b-c3438a431b19', '09fbdb2e-7f23-515d-88b7-f653c3b4dfc4', 'Découverte du besoin', 'Je suis capable d''identifier précisément le besoin et les critères de choix de mon client', 1),
  ('2f0e50d1-9427-56f9-b778-6b41220a58cf', '09fbdb2e-7f23-515d-88b7-f653c3b4dfc4', 'Budget et financement', 'Je sais qualifier le budget et le mode de financement de mon client', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('0ec1bf73-52e3-5ff2-9972-b2e2bb64611e', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Lien client', 'Je sais créer un lien unique avec mon client', 2);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('231fa962-b241-5567-974a-edf309bf110d', '0ec1bf73-52e3-5ff2-9972-b2e2bb64611e', 'Échange relationnel', 'Je sais éviter l''effet « interrogatoire » lorsque je cherche à obtenir des informations', 0),
  ('bc0b28ed-80d1-5aa0-9883-fb2beb3054c0', '0ec1bf73-52e3-5ff2-9972-b2e2bb64611e', 'Réassurance', 'Je suis capable de rassurer mon client en adaptant ma prise en charge', 1),
  ('8355000f-0951-566b-9ac1-377e376128f9', '0ec1bf73-52e3-5ff2-9972-b2e2bb64611e', 'Points communs', 'Je sais m''intéresser à mon client pour trouver des expériences communes', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('e37b93de-606b-52d2-827d-9df242a2718a', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Argumentation', 'Je sais proposer et argumenter une offre adaptée', 3);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('7515b7ed-cb7c-5ea6-a09a-34e649cd1cef', 'e37b93de-606b-52d2-827d-9df242a2718a', 'Offre adaptée', 'Je sais proposer l''offre adaptée en reformulant les points clés de la découverte', 0),
  ('ef1324c5-50d3-5efc-ab96-4c6a61dafd52', 'e37b93de-606b-52d2-827d-9df242a2718a', 'Méthode CAB', 'Je sais transformer les caractéristiques de mon offre en avantages et bénéfices — méthode CAB', 1),
  ('930648da-a2a5-574d-bc98-ea5c4341b96c', 'e37b93de-606b-52d2-827d-9df242a2718a', 'Démonstration', 'Je sais faire vivre mon offre par une démonstration ou un essai', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('de96585c-9bc6-54b7-8cfd-ae31f74e8861', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Objections', 'Je sais traiter les objections de mon client', 4);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('a0c4a3ba-502f-55ca-97eb-17aea34b48c4', 'de96585c-9bc6-54b7-8cfd-ae31f74e8861', 'Comprendre l''objection', 'Je sais me montrer empathique en accusant réception de l''objection sans effet « combat de boxe »', 0),
  ('8e216ac8-e4ab-5785-94c8-e059ec8bed9e', 'de96585c-9bc6-54b7-8cfd-ae31f74e8861', 'Déceler l''objection', 'Je suis capable de déterminer s''il s''agit d''une objection fondée en posant une question ouverte', 1),
  ('d6f62bd3-075a-5670-98e2-23aa322fa01b', 'de96585c-9bc6-54b7-8cfd-ae31f74e8861', 'Argumenter et rassurer', 'Je suis capable d''argumenter et de rassurer sur les doutes réels de mon client', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('6ba05743-bf1b-5683-8326-23aa3cdf03e7', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Offres complémentaires', 'Je sais proposer naturellement les offres complémentaires', 5);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('a913fb65-d2ec-5b5c-ae0c-cb7de8637ed0', '6ba05743-bf1b-5683-8326-23aa3cdf03e7', 'Financement en bénéfices', 'Je sais présenter le financement ou les modalités de paiement en avantages et bénéfices', 0),
  ('5f06a0ff-b959-5dd6-8366-1ebd79a235f0', '6ba05743-bf1b-5683-8326-23aa3cdf03e7', 'Teasing', 'Je sais évoquer une offre complémentaire avant d''en faire la proposition complète', 1),
  ('12915475-db9a-58ab-8e22-430147729408', '6ba05743-bf1b-5683-8326-23aa3cdf03e7', 'Produits complémentaires', 'Je sais proposer les services et produits complémentaires en les liant aux besoins découverts', 2),
  ('7f913c9d-d9b7-5192-b520-0044adb1b0ed', '6ba05743-bf1b-5683-8326-23aa3cdf03e7', 'Objections complémentaires', 'Je sais répondre aux objections liées aux offres complémentaires', 3);
insert into public.template_competencies (id, block_id, name, statement, position) values ('46ece3ee-e3e2-5348-bec7-6f53428cae98', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Conclusion et relance', 'Je sais conclure la vente et qualifier la non-vente', 6);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('36137995-1b5c-5c88-bd10-80b31805cfda', '46ece3ee-e3e2-5348-bec7-6f53428cae98', 'Conclusion', 'Je sais repérer les signaux d''achat et proposer la conclusion au bon moment', 0),
  ('1f9a18c1-6c28-544c-a4dc-82bdc3975c00', '46ece3ee-e3e2-5348-bec7-6f53428cae98', 'Raison de non-vente', 'Je sais identifier et communiquer précisément la raison de non-vente', 1),
  ('13f8b1cb-10f4-561d-9c5b-3fa573ee50b0', '46ece3ee-e3e2-5348-bec7-6f53428cae98', 'Relance personnalisée', 'Je sais personnaliser le niveau et le contenu de ma relance selon la raison de non-vente', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('c4069fe2-60a6-54fa-b9f5-87a1c1ef7132', '68fcd36b-2ffe-5b6f-b5d7-c47c7a22ca00', 'Fidélisation', 'Je sais soigner l''après-vente et planter les graines de la fidélisation', 7);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('fbc053fa-318c-5a7c-8798-6d7be1abd92e', 'c4069fe2-60a6-54fa-b9f5-87a1c1ef7132', 'Moment de remise', 'Je sais faire de la remise ou de la livraison un moment mémorable', 0),
  ('92d322d0-e290-5574-889b-03b85ffca44e', 'c4069fe2-60a6-54fa-b9f5-87a1c1ef7132', 'Suivi après-vente', 'Je sais expliquer les étapes après la vente et les services disponibles', 1),
  ('ae86ae62-a978-55c8-8178-a71b978cf700', 'c4069fe2-60a6-54fa-b9f5-87a1c1ef7132', 'Demande de recommandation', 'Je sais demander naturellement une recommandation à un client satisfait', 2);
insert into public.template_blocks (id, template_id, name, position) values ('4ab8adb2-1cec-54d1-8205-0ae7dc5a75f0', '2a5765d1-18f3-52e9-8b6d-f4e299cfe242', 'Bloc 2 — Compétences transversales', 1);
insert into public.template_competencies (id, block_id, name, statement, position) values ('5b083a91-1ae6-5566-95cc-7f3c22004499', '4ab8adb2-1cec-54d1-8205-0ae7dc5a75f0', 'Communication', 'Je sais adapter ma communication verbale, non verbale et paraverbale', 0);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('be7cb0c7-fb49-5028-9a16-c4618b9ccf4e', '5b083a91-1ae6-5566-95cc-7f3c22004499', 'Interpréter les signaux', 'Je suis capable d''interpréter les signaux de communication de mon client', 0),
  ('07f9d17f-5688-52b4-b979-a8ac7ebcb049', '5b083a91-1ae6-5566-95cc-7f3c22004499', 'Adapter le comportement', 'Je sais adapter mon comportement verbal, non verbal et paraverbal pour favoriser l''échange', 1),
  ('8d59ac07-d1ab-51d0-85bf-9282ef81284f', '5b083a91-1ae6-5566-95cc-7f3c22004499', 'Le SONCASE', 'Je sais utiliser les leviers du SONCASE pour appuyer mon discours', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('5053594f-b966-5acc-aae4-8c420d4493a2', '4ab8adb2-1cec-54d1-8205-0ae7dc5a75f0', 'Organisation', 'Je sais m''organiser avec rigueur en lien avec mon activité commerciale', 1);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('3657674c-707e-52cf-8a2a-afa9271c9491', '5053594f-b966-5acc-aae4-8c420d4493a2', 'Planifier mon activité', 'Je sais planifier et lisser mon activité pour assurer un suivi adapté de mes clients', 0),
  ('3710200f-5219-5782-80cf-05d2a87fc34c', '5053594f-b966-5acc-aae4-8c420d4493a2', 'Confirmer les rendez-vous', 'Je confirme 100 % de mes rendez-vous en creusant le projet', 1),
  ('c28cda5a-ef0a-5dc9-8996-2ee9dace93f0', '5053594f-b966-5acc-aae4-8c420d4493a2', 'Portefeuille', 'Je sais entretenir un portefeuille de prospects suffisant', 2),
  ('d1b5b646-8163-59fd-9efd-eb8ebe0f8b7f', '5053594f-b966-5acc-aae4-8c420d4493a2', 'Emails et relances', 'Je gère mes emails et mes relances sans oubli ni retard', 3);
insert into public.template_competencies (id, block_id, name, statement, position) values ('1521239b-81c0-52a7-8c12-23a19c155e82', '4ab8adb2-1cec-54d1-8205-0ae7dc5a75f0', 'Connaissance de l''offre', 'Je sais démontrer ma connaissance de l''offre', 2);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('9f56ea3d-10bd-598f-81c5-cc24b804133f', '1521239b-81c0-52a7-8c12-23a19c155e82', 'Produits et services', 'Je connais les caractéristiques des produits et services de mon offre', 0),
  ('730b7dbf-20e1-501e-bdf2-48952f697a94', '1521239b-81c0-52a7-8c12-23a19c155e82', 'Concurrence', 'Je suis capable de positionner notre offre face à la concurrence', 1),
  ('37df0203-cdba-5e44-bcb7-0f7b75c09b7a', '1521239b-81c0-52a7-8c12-23a19c155e82', 'Conditions commerciales', 'Je connais les conditions commerciales en vigueur : prix, remises, financement', 2);
insert into public.template_competencies (id, block_id, name, statement, position) values ('09c4af2f-2030-5f4e-b825-25f130bdf91c', '4ab8adb2-1cec-54d1-8205-0ae7dc5a75f0', 'Posture', 'Je soigne ma posture et mon attitude commerciale au quotidien', 3);
insert into public.template_skills (id, competency_id, name, statement, position) values
  ('9f1b588f-b0d2-5917-94ce-42ee794cc388', '09c4af2f-2030-5f4e-b825-25f130bdf91c', 'Objectifs personnels', 'Je suis capable de me fixer des objectifs de progression personnels', 0),
  ('19d36587-6728-5027-b120-053bfd29ef58', '09c4af2f-2030-5f4e-b825-25f130bdf91c', 'Résilience commerciale', 'Je sais gérer les refus et les périodes de creux sans décrocher', 1),
  ('3a638dc1-a5ff-59f3-b2f6-43aba3a19fd2', '09c4af2f-2030-5f4e-b825-25f130bdf91c', 'Relation manager', 'Je sais utiliser mon manager comme ressource de progression', 2),
  ('250eb186-8686-5594-8c28-570d8f5b4256', '09c4af2f-2030-5f4e-b825-25f130bdf91c', 'Posture proactive', 'J''adopte une posture proactive : je crée mes opportunités sans attendre', 3);


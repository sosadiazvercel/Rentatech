export type SuccessCase = {
 id: string;
 title: string;
 description: string;
 vimeoUrl: string;
};

// Replace each placeholder with an approved real case and its Vimeo share URL.
// Supports https://vimeo.com/VIDEO_ID and unlisted links with their privacy hash.
export const successCases: SuccessCase[] = [
 {id:'activacion',title:'Activación de marca',description:'Aquí contaremos el objetivo de la marca, la experiencia que creamos y cómo participaron los asistentes.',vimeoUrl:''},
 {id:'capacitacion',title:'Capacitación inmersiva',description:'Aquí mostraremos qué se buscaba enseñar, cómo se usó la realidad virtual y qué resultados se obtuvieron.',vimeoUrl:''},
 {id:'evento',title:'Una experiencia para compartir',description:'Aquí compartiremos un evento, la dinámica de juego y lo que hizo especial la experiencia para sus invitados.',vimeoUrl:''},
];

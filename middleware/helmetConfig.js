import helmet from 'helmet';

const configureHelmet = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
    ],
    imgSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      'data:',
    ],
    styleSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      ...(isProduction ? [] : ["'unsafe-inline'"]),
    ],
    connectSrc: [
      "'self'",
      `ws://${process.env.HOST || 'localhost'}:${process.env.PORT || 4000}/graphql`,
      'https://apollo-server-landing-page.cdn.apollographql.com',
    ],
    manifestSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
    ],
    fontSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    childSrc: ["'self'"],
    frameSrc: ["'self'"],
    workerSrc: ["'self'"],
  };

  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  });
};

export default configureHelmet;

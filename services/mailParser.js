const imaps = require('imap-simple');

exports.emailParser = async function(data) {

  // fetch unread email

  let config = {
    imap: {
        user: process.env.MAIL_PARSER_USERNAME,
        password: process.env.MAIL_PARSER_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000
    }
};

  try {
    const connection = await imaps.connect(config);
    console.log('CONNECTION SUCCESSFUL', new Date().toString());
    const box = await connection.openBox('INBOX');
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: true,
    };
    const results = await connection.search(searchCriteria, fetchOptions);
    
    results.forEach((res) => {
      // console.log("results >>>", res.parts);

      const text = res.parts.filter((part) => {
        return part.which === 'TEXT';
      });

      const header = res.parts.filter((part) => {
        return part.which === 'HEADER';
      });

      let subject = header[0].body.subject[0]
      let subjectArr = subject.split(' ')
      // console.log(subject.split(' '));
      let ndx = subjectArr.findIndex((el) => el === "ID")
      console.log(ndx, subjectArr[ndx+1])


    });
    connection.end();
  } catch (error) {
    console.log("ERRORRRRR!!!!!",error);
  }


}
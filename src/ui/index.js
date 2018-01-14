import {h as $} from 'preact';
import {Component} from 'preact-compat';
import {DOM} from 'preact-compat';
import AppBar from 'material-ui/AppBar';
import BlocksContainer from './blocks-container';
import ActivityMonitor from './activity-monitor';
import TransactionSender from './transaction-sender';
import Controls from './controls';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {indigo500, indigoA200} from 'material-ui/styles/colors';
import githubIcon from './mark-github.svg';
import {className} from './index.styl';

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: indigo500,
    accent1Color: indigoA200
  }
});

class Index extends Component {
  render() {
    return (
      $(MuiThemeProvider, {muiTheme},
        DOM.div({className},
          $(AppBar, {
              title: 'WebCoin',
              className: 'indigo500',
              showMenuIconButton: false
            },
            DOM.a({
                className: `${className}-github-link`,
                href: 'https://github.com/mrbar42/how-build-your-own-blockchain',
                target: '_blank'
              },
              DOM.img({src: githubIcon})
            )
          ),
          DOM.div({className: `${className}-wrapper`},
            $(BlocksContainer),
            $(ActivityMonitor),
            DOM.div(null,
              $(Controls),
              $(TransactionSender)
            )
          )
        )
      )
    );
  }
}

export default Index;

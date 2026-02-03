import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';

const TermsPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 头部 */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={handleBack}>
            <ArrowLeftOutlined />
            <span>返回</span>
          </button>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>服务条款</h1>
            <p className={styles.updateTime}>
              <span className={styles.badge}>最后更新</span>
              2026 年 2 月 3 日
            </p>
          </div>
        </header>

        {/* 导航目录 */}
        <nav className={styles.toc}>
          <h3 className={styles.tocTitle}>目录</h3>
          <ul className={styles.tocList}>
            <li><button onClick={() => scrollToSection('acceptance')}>1. 服务协议的接受</button></li>
            <li><button onClick={() => scrollToSection('services')}>2. 服务说明</button></li>
            <li><button onClick={() => scrollToSection('account')}>3. 用户账户</button></li>
            <li><button onClick={() => scrollToSection('conduct')}>4. 用户行为规范</button></li>
            <li><button onClick={() => scrollToSection('ip')}>5. 知识产权</button></li>
            <li><button onClick={() => scrollToSection('disclaimer')}>6. 免责声明</button></li>
            <li><button onClick={() => scrollToSection('liability')}>7. 责任限制</button></li>
            <li><button onClick={() => scrollToSection('changes')}>8. 条款修改</button></li>
            <li><button onClick={() => scrollToSection('law')}>9. 适用法律与争议解决</button></li>
            <li><button onClick={() => scrollToSection('contact')}>10. 联系我们</button></li>
          </ul>
        </nav>

        {/* 引言 */}
        <div className={styles.intro}>
          <p>
            欢迎使用 Aegis 身份认证服务。在使用我们的服务之前，请仔细阅读以下条款。
            这些条款构成您与 Aegis 之间具有法律约束力的协议。
          </p>
        </div>

        {/* 内容 */}
        <div className={styles.content}>
          <section id="acceptance" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>1</span>
              服务协议的接受
            </h2>
            <p>
              本服务条款（以下简称"本条款"）是您与 Aegis 之间关于使用 Aegis 身份认证服务（以下简称"本服务"）所订立的协议。
            </p>
            <div className={styles.highlight}>
              <p>
                <strong>重要提示：</strong>在您注册、登录或以其他方式使用本服务前，请您仔细阅读本条款的全部内容。
                如您不同意本条款的任何内容，请勿使用本服务。一旦您开始使用本服务，即表示您已充分理解并同意接受本条款的全部内容。
              </p>
            </div>
          </section>

          <section id="services" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>2</span>
              服务说明
            </h2>
            <p>Aegis 为用户提供安全、便捷的身份认证服务，包括但不限于：</p>
            <ul className={styles.featureList}>
              <li>
                <span className={styles.featureIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
                <span>用户身份验证与登录</span>
              </li>
              <li>
                <span className={styles.featureIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
                <span>单点登录（SSO）服务</span>
              </li>
              <li>
                <span className={styles.featureIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
                <span>多因素认证（MFA）</span>
              </li>
              <li>
                <span className={styles.featureIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
                <span>第三方身份提供商集成</span>
              </li>
              <li>
                <span className={styles.featureIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
                <span>访问控制与授权管理</span>
              </li>
            </ul>
            <p className={styles.note}>
              我们保留随时修改、更新或终止本服务的任何部分的权利，恕不另行通知。
            </p>
          </section>

          <section id="account" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>3</span>
              用户账户
            </h2>
            
            <h3>3.1 账户注册</h3>
            <p>
              您在注册账户时，应提供真实、准确、完整的个人信息。如果您提供的信息不准确或不完整，
              我们有权限制或终止您对本服务的使用。
            </p>

            <h3>3.2 账户安全</h3>
            <p>
              您有责任保管好您的账户凭证（包括但不限于密码、安全密钥等），并对使用您账户进行的所有活动负责。
              如发现任何未经授权使用您账户的情况，请立即通知我们。
            </p>

            <h3>3.3 账户终止</h3>
            <p>我们保留在以下情况下暂停或终止您账户的权利：</p>
            <ul>
              <li>违反本条款</li>
              <li>从事欺诈或非法活动</li>
              <li>长期不活跃</li>
              <li>出于安全考虑</li>
            </ul>
          </section>

          <section id="conduct" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>4</span>
              用户行为规范
            </h2>
            <p>在使用本服务时，您同意不会：</p>
            <ul className={styles.warningList}>
              <li>违反任何适用的法律法规</li>
              <li>侵犯他人的知识产权、隐私权或其他合法权益</li>
              <li>传播恶意软件、病毒或其他有害代码</li>
              <li>尝试未经授权访问本服务的系统或网络</li>
              <li>干扰或破坏本服务的正常运行</li>
              <li>冒充他人或虚假陈述您与任何人或实体的关系</li>
              <li>收集或存储其他用户的个人信息</li>
            </ul>
          </section>

          <section id="ip" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>5</span>
              知识产权
            </h2>
            <p>
              本服务及其所有内容，包括但不限于文字、图形、标识、图像、软件和技术，
              均受著作权、商标权和其他知识产权法律的保护。未经明确书面许可，
              您不得复制、修改、分发或以其他方式使用这些内容。
            </p>
          </section>

          <section id="disclaimer" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>6</span>
              免责声明
            </h2>
            <div className={styles.disclaimer}>
              <p>
                本服务按"现状"和"可用"基础提供。在法律允许的最大范围内，我们不对以下事项作出任何明示或暗示的保证：
              </p>
              <ul>
                <li>服务将满足您的特定需求</li>
                <li>服务将不间断、及时、安全或无错误</li>
                <li>通过服务获得的结果将准确或可靠</li>
              </ul>
            </div>
          </section>

          <section id="liability" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>7</span>
              责任限制
            </h2>
            <p>
              在法律允许的最大范围内，对于因使用或无法使用本服务而导致的任何直接、间接、
              附带、特殊、惩罚性或后果性损害，我们概不负责，即使我们已被告知可能发生此类损害。
            </p>
          </section>

          <section id="changes" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>8</span>
              条款修改
            </h2>
            <p>
              我们保留随时修改本条款的权利。修改后的条款将在本页面上发布，并更新"最后更新"日期。
              继续使用本服务即表示您接受修改后的条款。建议您定期查阅本条款以了解任何变更。
            </p>
          </section>

          <section id="law" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>9</span>
              适用法律与争议解决
            </h2>
            <p>
              本条款的解释、效力及争议的解决均适用中华人民共和国法律。
              因本条款引起的或与本条款有关的任何争议，双方应首先通过友好协商解决；
              协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>10</span>
              联系我们
            </h2>
            <p>如您对本服务条款有任何疑问或意见，请通过以下方式联系我们：</p>
            <div className={styles.contactCard}>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </span>
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>电子邮件</span>
                  <a href="mailto:aegis@heliannuuthus.com" className={styles.contactValue}>
                    aegis@heliannuuthus.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 页脚 */}
        <footer className={styles.footer}>
          <p>© 2026 Aegis. 保留所有权利。</p>
        </footer>
      </div>
    </div>
  );
};

export default TermsPage;

import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import styles from './index.module.scss';

const PrivacyPage = () => {
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
            <h1 className={styles.title}>隐私政策</h1>
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
            <li><button onClick={() => scrollToSection('intro')}>引言</button></li>
            <li><button onClick={() => scrollToSection('collect')}>1. 我们收集的信息</button></li>
            <li><button onClick={() => scrollToSection('use')}>2. 我们如何使用信息</button></li>
            <li><button onClick={() => scrollToSection('share')}>3. 信息共享与披露</button></li>
            <li><button onClick={() => scrollToSection('security')}>4. 信息存储与保护</button></li>
            <li><button onClick={() => scrollToSection('cookie')}>5. Cookie 和追踪技术</button></li>
            <li><button onClick={() => scrollToSection('rights')}>6. 您的权利</button></li>
            <li><button onClick={() => scrollToSection('children')}>7. 儿童隐私</button></li>
            <li><button onClick={() => scrollToSection('thirdparty')}>8. 第三方链接</button></li>
            <li><button onClick={() => scrollToSection('changes')}>9. 隐私政策的变更</button></li>
            <li><button onClick={() => scrollToSection('contact')}>10. 联系我们</button></li>
          </ul>
        </nav>

        {/* 摘要卡片 */}
        <div className={styles.summary}>
          <div className={styles.summaryIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div className={styles.summaryContent}>
            <h3>隐私保护承诺</h3>
            <p>
              Aegis 致力于保护您的隐私。我们仅收集提供服务所必需的信息，
              并采取行业领先的安全措施保护您的数据安全。
            </p>
          </div>
        </div>

        {/* 内容 */}
        <div className={styles.content}>
          <section id="intro" className={styles.section}>
            <h2>
              <span className={styles.sectionIcon}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </span>
              引言
            </h2>
            <p>
              Aegis（以下简称"我们"）非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、
              存储和保护您的个人信息，以及您对这些信息所享有的权利。
            </p>
            <div className={styles.highlight}>
              <p>
                请您在使用我们的服务前，仔细阅读并了解本隐私政策的全部内容。
                使用我们的服务即表示您同意本隐私政策的条款。
              </p>
            </div>
          </section>

          <section id="collect" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>1</span>
              我们收集的信息
            </h2>

            <div className={styles.subsection}>
              <h3>
                <span className={styles.subsectionBadge}>1.1</span>
                您主动提供的信息
              </h3>
              <p>当您注册账户或使用我们的服务时，您可能需要提供以下信息：</p>
              <div className={styles.dataTable}>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>账户信息</div>
                  <div className={styles.dataDesc}>电子邮箱地址、用户名、密码</div>
                </div>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>身份信息</div>
                  <div className={styles.dataDesc}>姓名、电话号码（用于多因素认证）</div>
                </div>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>第三方账户</div>
                  <div className={styles.dataDesc}>当您选择使用第三方登录时，我们可能会从该第三方获取您的基本资料信息</div>
                </div>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3>
                <span className={styles.subsectionBadge}>1.2</span>
                自动收集的信息
              </h3>
              <p>当您使用我们的服务时，我们会自动收集某些信息：</p>
              <div className={styles.dataTable}>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>设备信息</div>
                  <div className={styles.dataDesc}>设备类型、操作系统、浏览器类型和版本</div>
                </div>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>日志信息</div>
                  <div className={styles.dataDesc}>访问时间、IP 地址、登录记录、操作日志</div>
                </div>
                <div className={styles.dataRow}>
                  <div className={styles.dataType}>Cookie</div>
                  <div className={styles.dataDesc}>用于维持登录状态和改善用户体验</div>
                </div>
              </div>
            </div>
          </section>

          <section id="use" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>2</span>
              我们如何使用信息
            </h2>
            <p>我们收集的信息将用于以下目的：</p>
            <div className={styles.purposeGrid}>
              <div className={styles.purposeCard}>
                <div className={styles.purposeIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4>提供服务</h4>
                <p>验证您的身份、处理登录请求、提供身份认证服务</p>
              </div>
              <div className={styles.purposeCard}>
                <div className={styles.purposeIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4>安全保障</h4>
                <p>检测和防止欺诈、滥用和安全威胁</p>
              </div>
              <div className={styles.purposeCard}>
                <div className={styles.purposeIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4>服务改进</h4>
                <p>分析使用模式以改进我们的服务</p>
              </div>
              <div className={styles.purposeCard}>
                <div className={styles.purposeIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h4>客户支持</h4>
                <p>响应您的咨询和请求</p>
              </div>
              <div className={styles.purposeCard}>
                <div className={styles.purposeIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4>法律合规</h4>
                <p>遵守适用的法律法规要求</p>
              </div>
            </div>
          </section>

          <section id="share" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>3</span>
              信息共享与披露
            </h2>
            <div className={styles.importantNote}>
              <span className={styles.noteIcon}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </span>
              <p><strong>我们不会出售您的个人信息。</strong>我们仅在以下情况下共享您的信息：</p>
            </div>
            <ul className={styles.shareList}>
              <li>
                <strong>获得您的同意：</strong>在获得您明确同意的情况下共享信息
              </li>
              <li>
                <strong>服务提供商：</strong>与帮助我们运营服务的可信赖第三方共享（如云服务提供商），
                这些第三方受到严格的数据保护义务约束
              </li>
              <li>
                <strong>关联应用：</strong>当您授权第三方应用访问您的账户时，我们会按照您的授权范围共享必要的信息
              </li>
              <li>
                <strong>法律要求：</strong>为遵守法律义务、执行我们的服务条款或保护我们及用户的权利和安全
              </li>
            </ul>
          </section>

          <section id="security" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>4</span>
              信息存储与保护
            </h2>

            <div className={styles.subsection}>
              <h3>
                <span className={styles.subsectionBadge}>4.1</span>
                数据存储
              </h3>
              <p>
                您的个人信息存储在位于中华人民共和国境内的安全服务器中。我们会在提供服务所必需的期限内保留您的信息，
                或在法律要求的期限内保留。
              </p>
            </div>

            <div className={styles.subsection}>
              <h3>
                <span className={styles.subsectionBadge}>4.2</span>
                安全措施
              </h3>
              <p>我们采取多种安全措施来保护您的个人信息：</p>
              <div className={styles.securityGrid}>
                <div className={styles.securityItem}>
                  <span className={styles.securityIcon}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>TLS/SSL 加密传输</span>
                </div>
                <div className={styles.securityItem}>
                  <span className={styles.securityIcon}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                    </svg>
                  </span>
                  <span>敏感数据加密存储</span>
                </div>
                <div className={styles.securityItem}>
                  <span className={styles.securityIcon}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                    </svg>
                  </span>
                  <span>严格的访问控制</span>
                </div>
                <div className={styles.securityItem}>
                  <span className={styles.securityIcon}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>定期安全审计</span>
                </div>
              </div>
              <p className={styles.note}>
                尽管我们采取了合理的安全措施，但请理解互联网上不存在完全安全的数据传输或存储方法。
              </p>
            </div>
          </section>

          <section id="cookie" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>5</span>
              Cookie 和追踪技术
            </h2>
            <p>我们使用 Cookie 和类似技术来：</p>
            <ul>
              <li>维持您的登录状态</li>
              <li>记住您的偏好设置</li>
              <li>分析服务使用情况</li>
              <li>防止欺诈和保障安全</li>
            </ul>
            <p>
              您可以通过浏览器设置管理 Cookie 偏好。但请注意，禁用 Cookie 可能会影响服务的某些功能。
            </p>
          </section>

          <section id="rights" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>6</span>
              您的权利
            </h2>
            <p>根据适用的数据保护法律，您享有以下权利：</p>
            <div className={styles.rightsGrid}>
              <div className={styles.rightItem}>
                <h4>访问权</h4>
                <p>您有权请求访问我们持有的您的个人信息</p>
              </div>
              <div className={styles.rightItem}>
                <h4>更正权</h4>
                <p>您有权要求更正不准确的个人信息</p>
              </div>
              <div className={styles.rightItem}>
                <h4>删除权</h4>
                <p>在某些情况下，您有权要求删除您的个人信息</p>
              </div>
              <div className={styles.rightItem}>
                <h4>数据可携带权</h4>
                <p>您有权以结构化、通用的格式获取您的个人信息</p>
              </div>
              <div className={styles.rightItem}>
                <h4>撤回同意</h4>
                <p>您可以随时撤回之前给予的同意</p>
              </div>
              <div className={styles.rightItem}>
                <h4>注销账户</h4>
                <p>您有权请求注销您的账户</p>
              </div>
            </div>
            <p>如需行使上述权利，请通过本政策末尾的联系方式与我们联系。</p>
          </section>

          <section id="children" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>7</span>
              儿童隐私
            </h2>
            <p>
              我们的服务不面向 14 周岁以下的儿童。我们不会故意收集 14 周岁以下儿童的个人信息。
              如果您是父母或监护人，发现您的孩子在未经您同意的情况下向我们提供了个人信息，请与我们联系，
              我们将采取措施删除相关信息。
            </p>
          </section>

          <section id="thirdparty" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>8</span>
              第三方链接
            </h2>
            <p>
              我们的服务可能包含指向第三方网站或服务的链接。我们对这些第三方的隐私实践不承担责任。
              建议您在访问任何第三方服务之前查阅其隐私政策。
            </p>
          </section>

          <section id="changes" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>9</span>
              隐私政策的变更
            </h2>
            <p>
              我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"最后更新"日期。
              对于重大变更，我们会通过适当方式通知您（如在服务中发布通知或发送电子邮件）。
              建议您定期查阅本政策以了解最新的隐私保护措施。
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2>
              <span className={styles.sectionNumber}>10</span>
              联系我们
            </h2>
            <p>
              如果您对本隐私政策有任何疑问、意见或请求，或者希望行使您的数据权利，请通过以下方式与我们联系：
            </p>
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
            <p className={styles.responseTime}>
              我们将在收到您的请求后 <strong>15 个工作日</strong>内予以回复。
            </p>
          </section>
        </div>

        {/* 页脚 */}
        <footer className={styles.footer}>
          <div className={styles.footerLinks}>
            <Link to="/terms">服务条款</Link>
            <span className={styles.divider}>·</span>
            <span>隐私政策</span>
          </div>
          <p>© 2026 Aegis. 保留所有权利。</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPage;

import { Component, inject, input, OnInit, signal } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { forkJoin } from 'rxjs'
import { BillService } from '../../core/services/bill.service'
import { Bill, PointsReward } from '../../core/models/bill.model'

@Component({
  selector: 'app-bill-request',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <section class="bill card" aria-labelledby="bill-title">
      <h2 id="bill-title">La cuenta</h2>

      @if (loading()) {
        <div class="spinner" role="status" aria-label="Cargando la cuenta"></div>
      } @else if (bill(); as b) {
        <dl class="bill-summary">
          <div class="row"><dt>Subtotal</dt><dd>{{ b.subtotal | number:'1.2-2' }} €</dd></div>
          @if (b.codeDiscount > 0) {
            <div class="row discount"><dt>Código {{ b.discountCode }}</dt><dd>-{{ b.codeDiscount | number:'1.2-2' }} €</dd></div>
          }
          @if (b.pointsDiscount > 0) {
            <div class="row discount"><dt>Puntos canjeados ({{ b.pointsUsed }})</dt><dd>-{{ b.pointsDiscount | number:'1.2-2' }} €</dd></div>
          }
          <div class="row total"><dt>Total a pagar</dt><dd>{{ b.total | number:'1.2-2' }} €</dd></div>
        </dl>
        <p class="bill-note" role="status">Has pedido la cuenta. Un camarero te la traerá a la mesa.</p>
      } @else {
        <form (ngSubmit)="request()" novalidate>
          <div class="form-group">
            <label for="discount-code">Código de descuento (opcional)</label>
            <input
              id="discount-code"
              name="discountCode"
              type="text"
              class="form-control"
              autocomplete="off"
              [(ngModel)]="discountCode"
            />
          </div>

          @if (rewards().length > 0) {
            <fieldset class="rewards">
              <legend>Canjear puntos</legend>
              <p class="balance">Tienes {{ balance() }} puntos</p>
              <label class="reward-option">
                <input type="radio" name="reward" [checked]="selectedRewardId() === null" (change)="selectedRewardId.set(null)" />
                No canjear puntos
              </label>
              @for (reward of rewards(); track reward.id) {
                <label class="reward-option" [class.disabled]="reward.points > balance()">
                  <input
                    type="radio"
                    name="reward"
                    [disabled]="reward.points > balance()"
                    [checked]="selectedRewardId() === reward.id"
                    (change)="selectedRewardId.set(reward.id)"
                  />
                  {{ reward.points }} puntos = {{ reward.discount | number:'1.2-2' }} € de descuento
                  @if (reward.points > balance()) {
                    <span class="reward-hint">(puntos insuficientes)</span>
                  }
                </label>
              }
            </fieldset>
          }

          @if (error()) {
            <div class="alert-error" role="alert">{{ error() }}</div>
          }

          <button type="submit" class="btn btn-primary request-btn" [disabled]="requesting()" [attr.aria-busy]="requesting()">
            {{ requesting() ? 'Pidiendo la cuenta...' : 'Pedir la cuenta' }}
          </button>
        </form>
      }
    </section>
  `,
  styles: [`
    .bill {
      margin-top: 20px;
      padding: 24px;
    }
    .bill h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .rewards {
      border: 0;
      margin-bottom: 16px;
    }
    .rewards legend {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .balance {
      color: var(--text-secondary);
      font-size: 13px;
      margin-bottom: 8px;
    }
    .reward-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      cursor: pointer;
    }
    .reward-option.disabled {
      color: var(--text-secondary);
      cursor: not-allowed;
    }
    .reward-hint {
      font-size: 12px;
    }
    .request-btn {
      width: 100%;
      justify-content: center;
    }
    .bill-summary .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .bill-summary .discount dd {
      color: var(--green-light);
    }
    .bill-summary .total {
      border-top: 1px dashed var(--border-color);
      margin-top: 8px;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
    }
    .bill-note {
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 12px;
    }
    button:focus-visible,
    input:focus-visible {
      outline: 3px solid var(--yellow);
      outline-offset: 2px;
    }
  `]
})
export class BillRequestComponent implements OnInit {
  private readonly billService = inject(BillService)

  readonly orderId = input.required<string>()
  readonly restaurantId = input.required<string>()

  discountCode = ''

  readonly loading = signal(true)
  readonly requesting = signal(false)
  readonly bill = signal<Bill | null>(null)
  readonly rewards = signal<PointsReward[]>([])
  readonly balance = signal(0)
  readonly selectedRewardId = signal<string | null>(null)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    // Si la cuenta ya se pidió se muestra; si no (404) se prepara el formulario
    this.billService.getBill(this.orderId()).subscribe({
      next: bill => {
        this.bill.set(bill)
        this.loading.set(false)
      },
      error: () => this.loadOptions()
    })
  }

  private loadOptions(): void {
    forkJoin({
      rewards: this.billService.getRewards(this.restaurantId()),
      balance: this.billService.getBalance(this.restaurantId())
    }).subscribe({
      next: ({ rewards, balance }) => {
        this.rewards.set(rewards)
        this.balance.set(balance.points)
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })
  }

  request(): void {
    if (this.requesting()) return
    this.requesting.set(true)
    this.error.set(null)

    this.billService.requestBill(this.orderId(), {
      discountCode: this.discountCode.trim() || null,
      pointsRewardId: this.selectedRewardId()
    }).subscribe({
      next: bill => {
        this.bill.set(bill)
        this.requesting.set(false)
      },
      error: err => {
        this.requesting.set(false)
        const code = err?.error?.error
        if (err?.status === 409) {
          this.error.set('La cuenta de este pedido ya se había pedido.')
          this.ngOnInit()
        } else if (code === 'InvalidDiscountCodeError') {
          this.error.set('El código de descuento no es válido.')
        } else if (code === 'InsufficientPointsError') {
          this.error.set('No tienes puntos suficientes para ese canje.')
        } else {
          this.error.set('No se pudo pedir la cuenta. Inténtalo de nuevo.')
        }
      }
    })
  }
}
